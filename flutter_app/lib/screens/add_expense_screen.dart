import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../config/constants.dart';
import '../providers/expense_provider.dart';

class AddExpenseScreen extends StatefulWidget {
  const AddExpenseScreen({super.key});

  @override
  State<AddExpenseScreen> createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends State<AddExpenseScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Tab 1: Ghi nhanh
  String _person = 'Khoa';
  final _detailCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();

  // Tab 2: Chia bill
  final _splitDetailCtrl = TextEditingController();
  final _splitAmountCtrl = TextEditingController();
  final Set<String> _splitPeople = {'Khoa'};

  // Tab 3: Được trả hộ
  late String _payer;
  final _paidDetailCtrl = TextEditingController();
  final _paidAmountCtrl = TextEditingController();

  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _payer = AppConstants.people.firstWhere((p) => p != 'Khoa');
  }

  @override
  void dispose() {
    _tabController.dispose();
    _detailCtrl.dispose();
    _amountCtrl.dispose();
    _splitDetailCtrl.dispose();
    _splitAmountCtrl.dispose();
    _paidDetailCtrl.dispose();
    _paidAmountCtrl.dispose();
    super.dispose();
  }

  // Chấp nhận "30k" hoặc "30000"
  int _parseAmount(String text) {
    final clean = text.trim().toLowerCase();
    if (clean.endsWith('k')) {
      final val = int.tryParse(clean.replaceAll('k', '')) ?? 0;
      return val * 1000;
    }
    final val = int.tryParse(clean) ?? 0;
    return (val.abs() < 10000 && val != 0) ? val * 1000 : val;
  }

  String _fmtNum(int n) {
    final s = n.abs().toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    return buf.toString();
  }

  void _showErr(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red),
    );
  }

  Future<void> _submitQuick() async {
    if (_detailCtrl.text.trim().isEmpty) { _showErr('Vui lòng nhập mô tả'); return; }
    final amount = _parseAmount(_amountCtrl.text);
    if (amount == 0) { _showErr('Vui lòng nhập số tiền hợp lệ'); return; }

    setState(() => _submitting = true);
    final ok = await context.read<ExpenseProvider>().addExpense(
      name: _person,
      detail: _detailCtrl.text.trim(),
      amount: amount,
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (ok) {
      Navigator.pop(context, true);
    } else {
      _showErr(context.read<ExpenseProvider>().error ?? 'Lỗi không xác định');
    }
  }

  Future<void> _submitSplit() async {
    if (_splitDetailCtrl.text.trim().isEmpty) { _showErr('Vui lòng nhập mô tả'); return; }
    if (_splitPeople.isEmpty) { _showErr('Chọn ít nhất 1 người'); return; }
    final amount = _parseAmount(_splitAmountCtrl.text);
    if (amount == 0) { _showErr('Vui lòng nhập số tiền hợp lệ'); return; }

    // Khoa luôn đứng đầu để nhận phần dư
    final people = [
      if (_splitPeople.contains('Khoa')) 'Khoa',
      ..._splitPeople.where((p) => p != 'Khoa'),
    ];

    setState(() => _submitting = true);
    final ok = await context.read<ExpenseProvider>().splitBill(
      detail: _splitDetailCtrl.text.trim(),
      amount: amount,
      people: people,
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (ok) {
      Navigator.pop(context, true);
    } else {
      _showErr(context.read<ExpenseProvider>().error ?? 'Lỗi không xác định');
    }
  }

  Future<void> _submitPaidBy() async {
    if (_paidDetailCtrl.text.trim().isEmpty) { _showErr('Vui lòng nhập mô tả'); return; }
    final amount = _parseAmount(_paidAmountCtrl.text);
    if (amount == 0) { _showErr('Vui lòng nhập số tiền hợp lệ'); return; }

    setState(() => _submitting = true);
    final ok = await context.read<ExpenseProvider>().paidByOther(
      payer: _payer,
      detail: _paidDetailCtrl.text.trim(),
      amount: amount,
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (ok) {
      Navigator.pop(context, true);
    } else {
      _showErr(context.read<ExpenseProvider>().error ?? 'Lỗi không xác định');
    }
  }

  Widget _amountField(TextEditingController ctrl, {void Function(String)? onChange}) {
    return TextField(
      controller: ctrl,
      keyboardType: const TextInputType.numberWithOptions(signed: true),
      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[-0-9kK]'))],
      onChanged: onChange,
      decoration: const InputDecoration(
        labelText: 'Số tiền',
        hintText: 'VD: 30k hoặc 30000',
        border: OutlineInputBorder(),
        suffixText: 'đ',
      ),
    );
  }

  Widget _saveBtn(String label, IconData icon, VoidCallback onPressed) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton.icon(
        onPressed: _submitting ? null : onPressed,
        icon: _submitting
            ? const SizedBox(
                width: 16, height: 16,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
              )
            : Icon(icon),
        label: Text(label),
      ),
    );
  }

  // ── TAB 1: Ghi nhanh ──────────────────────────────────
  Widget _tab1() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            value: _person,
            decoration: const InputDecoration(labelText: 'Người chi', border: OutlineInputBorder()),
            items: AppConstants.people
                .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                .toList(),
            onChanged: (v) => setState(() => _person = v!),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _detailCtrl,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              labelText: 'Mô tả chi tiêu',
              hintText: 'VD: Ăn cơm, Tiền xăng...',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          _amountField(_amountCtrl),
          const SizedBox(height: 24),
          _saveBtn('Lưu chi tiêu', Icons.save, _submitQuick),
        ],
      ),
    );
  }

  // ── TAB 2: Chia bill ──────────────────────────────────
  Widget _tab2() {
    final amount = _parseAmount(_splitAmountCtrl.text);
    final count = _splitPeople.length;
    final perPerson = (count > 0 && amount > 0) ? (amount / count).round() : 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _splitDetailCtrl,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              labelText: 'Mô tả',
              hintText: 'VD: Buffet, Tiền grab...',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          _amountField(_splitAmountCtrl, onChange: (_) => setState(() {})),
          const SizedBox(height: 16),
          Text('Chọn người chia bill:',
              style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: AppConstants.people.map((p) {
              final selected = _splitPeople.contains(p);
              return FilterChip(
                label: Text(p, style: const TextStyle(fontSize: 13)),
                selected: selected,
                onSelected: (v) => setState(
                  () => v ? _splitPeople.add(p) : _splitPeople.remove(p),
                ),
              );
            }).toList(),
          ),
          if (count > 0 && amount > 0) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Mỗi người: ~${_fmtNum(perPerson)}đ  ($count người)',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
              ),
            ),
          ],
          const SizedBox(height: 24),
          _saveBtn('Chia & Lưu', Icons.call_split, _submitSplit),
        ],
      ),
    );
  }

  // ── TAB 3: Được trả hộ ───────────────────────────────
  Widget _tab3() {
    final amount = _parseAmount(_paidAmountCtrl.text);
    final phanKhoa = amount > 0 ? (amount / 2).round() : 0;
    final phanNguoi = amount - phanKhoa;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButtonFormField<String>(
            value: _payer,
            decoration: const InputDecoration(
              labelText: 'Người đã trả hộ',
              border: OutlineInputBorder(),
            ),
            items: AppConstants.people
                .where((p) => p != 'Khoa')
                .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                .toList(),
            onChanged: (v) => setState(() => _payer = v!),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _paidDetailCtrl,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              labelText: 'Mô tả',
              hintText: 'VD: Tiền nước, Cơm...',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          _amountField(_paidAmountCtrl, onChange: (_) => setState(() {})),
          if (amount > 0) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Khoa: +${_fmtNum(phanKhoa)}đ  (chi tiêu cá nhân)',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$_payer: -${_fmtNum(phanNguoi)}đ  (đã trả hộ)',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 24),
          _saveBtn('Lưu', Icons.person_add, _submitPaidBy),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ghi Chi Tiêu', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: primary,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Ghi nhanh', icon: Icon(Icons.add_circle_outline, size: 18)),
            Tab(text: 'Chia bill', icon: Icon(Icons.call_split, size: 18)),
            Tab(text: 'Được trả hộ', icon: Icon(Icons.person_add, size: 18)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [_tab1(), _tab2(), _tab3()],
      ),
    );
  }
}
