import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/expense_provider.dart';
import '../services/storage_service.dart';
import '../widgets/expense_card.dart';
import '../models/expense.dart';
import 'add_expense_screen.dart';
import 'stats_screen.dart';
import 'setup_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ExpenseProvider>().loadExpenses();
    });
  }

  Map<String, List<Expense>> _groupByDate(List<Expense> expenses) {
    final map = <String, List<Expense>>{};
    for (final e in expenses) {
      map.putIfAbsent(e.date, () => []).add(e);
    }
    return map;
  }

  Future<void> _handleUndo() async {
    final provider = context.read<ExpenseProvider>();
    final ok = await provider.undoLast();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(ok ? 'Đã xóa dòng vừa ghi!' : 'Không thể undo (quá 1 phút)'),
      backgroundColor: ok ? Colors.green : Colors.red,
    ));
  }

  Future<void> _openAdd() async {
    final added = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const AddExpenseScreen()),
    );
    if (added == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Đã ghi thành công!'),
        backgroundColor: Colors.green,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi Tiêu', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: primary,
        foregroundColor: Colors.white,
        actions: [
          Consumer<ExpenseProvider>(
            builder: (_, p, __) => p.canUndo
                ? IconButton(
                    icon: const Icon(Icons.undo),
                    tooltip: 'Undo dòng vừa ghi',
                    onPressed: _handleUndo,
                  )
                : const SizedBox.shrink(),
          ),
          IconButton(
            icon: const Icon(Icons.bar_chart_rounded),
            tooltip: 'Thống kê',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const StatsScreen()),
            ),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (val) async {
              if (val == 'reconfigure') {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (_) => AlertDialog(
                    title: const Text('Cài lại URL?'),
                    content: const Text('Dữ liệu trên Sheet không bị mất, chỉ xóa URL đã lưu trên máy này.'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
                      FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Xác nhận')),
                    ],
                  ),
                );
                if (confirm == true && context.mounted) {
                  await StorageService.clearUrl();
                  if (context.mounted) {
                    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const SetupScreen()));
                  }
                }
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'reconfigure', child: Text('Cài lại URL Apps Script')),
            ],
          ),
        ],
      ),
      body: Consumer<ExpenseProvider>(
        builder: (context, provider, _) {
          if (provider.loading && provider.expenses.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null && provider.expenses.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.cloud_off, size: 56, color: Colors.grey),
                    const SizedBox(height: 12),
                    const Text('Không kết nối được', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 6),
                    Text(
                      'Kiểm tra URL trong constants.dart\nhoặc kết nối mạng',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 20),
                    FilledButton.icon(
                      onPressed: provider.loadExpenses,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Thử lại'),
                    ),
                  ],
                ),
              ),
            );
          }

          if (provider.expenses.isEmpty) {
            return const Center(child: Text('Chưa có giao dịch nào'));
          }

          final grouped = _groupByDate(provider.expenses);
          final dates = grouped.keys.toList();

          return RefreshIndicator(
            onRefresh: provider.loadExpenses,
            child: ListView.builder(
              itemCount: dates.length,
              itemBuilder: (context, i) {
                final date = dates[i];
                final items = grouped[date]!;
                final dayTotal = items.fold<int>(0, (sum, e) => sum + e.amount);
                final totalStr = dayTotal >= 0
                    ? '+${_fmt(dayTotal)}đ'
                    : '-${_fmt(dayTotal.abs())}đ';

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
                      child: Row(
                        children: [
                          Text(
                            date,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: primary,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            totalStr,
                            style: TextStyle(
                              fontSize: 12,
                              color: dayTotal >= 0 ? Colors.red[600] : Colors.green[600],
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    ...items.map((e) => ExpenseCard(expense: e)),
                    const Divider(height: 1, indent: 16),
                  ],
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAdd,
        icon: const Icon(Icons.add),
        label: const Text('Ghi chi tiêu'),
      ),
    );
  }

  String _fmt(int n) {
    final s = n.toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    return buf.toString();
  }
}
