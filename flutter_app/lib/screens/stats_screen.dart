import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/expense_provider.dart';

class StatsScreen extends StatefulWidget {
  const StatsScreen({super.key});

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen> {
  late int _month;
  late int _year;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _month = now.month;
    _year = now.year;
    _load();
  }

  void _load() {
    context.read<ExpenseProvider>().loadStats(
      month: _month.toString().padLeft(2, '0'),
      year: _year.toString(),
    );
  }

  void _prev() {
    setState(() {
      _month--;
      if (_month < 1) { _month = 12; _year--; }
    });
    _load();
  }

  void _next() {
    setState(() {
      _month++;
      if (_month > 12) { _month = 1; _year++; }
    });
    _load();
  }

  String _fmt(num n) {
    final abs = n.abs().toInt();
    final s = abs.toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    return (n < 0 ? '-' : '') + buf.toString();
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Thống kê', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Month selector
          Container(
            color: Theme.of(context).colorScheme.primaryContainer,
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: _prev,
                  color: primary,
                ),
                Text(
                  'Tháng $_month/$_year',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: primary,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: _next,
                  color: primary,
                ),
              ],
            ),
          ),
          Expanded(
            child: Consumer<ExpenseProvider>(
              builder: (_, provider, __) {
                if (provider.statsLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                final stats = provider.stats;
                if (stats.isEmpty || stats['success'] != true) {
                  return const Center(child: Text('Không có dữ liệu'));
                }

                final total = (stats['total'] as num?)?.toInt() ?? 0;
                final byPerson = (stats['byPerson'] as Map?)?.cast<String, num>() ?? {};
                final byCategory = (stats['byCategory'] as Map?)?.cast<String, num>() ?? {};

                final sortedPerson = byPerson.entries.where((e) => e.key.isNotEmpty).toList()
                  ..sort((a, b) => b.value.compareTo(a.value));
                final sortedCategory = byCategory.entries.where((e) => e.key.isNotEmpty).toList()
                  ..sort((a, b) => b.value.compareTo(a.value));

                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Total card
                    Card(
                      color: primary,
                      elevation: 0,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                        child: Column(
                          children: [
                            const Text(
                              'Tổng chi tiêu',
                              style: TextStyle(color: Colors.white70, fontSize: 13),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${_fmt(total)}đ',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 30,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // By person
                    if (sortedPerson.isNotEmpty) ...[
                      _sectionTitle('Theo người'),
                      const SizedBox(height: 8),
                      ...sortedPerson.map((e) => _row(e.key, e.value.toInt())),
                      const SizedBox(height: 20),
                    ],

                    // By category
                    if (sortedCategory.isNotEmpty) ...[
                      _sectionTitle('Theo hạng mục'),
                      const SizedBox(height: 8),
                      ...sortedCategory.map((e) => _row(e.key, e.value.toInt())),
                    ],
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
    );
  }

  Widget _row(String label, int amount) {
    final color = amount >= 0 ? Colors.red[700]! : Colors.green[700]!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 14))),
          Text(
            '${_fmt(amount)}đ',
            style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 14),
          ),
        ],
      ),
    );
  }
}
