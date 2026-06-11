import 'package:flutter/foundation.dart';
import '../models/expense.dart';
import '../services/api_service.dart';

class LastAction {
  final int rowIndex;
  final int count;
  final DateTime time;

  LastAction(this.rowIndex, this.count) : time = DateTime.now();

  bool get canUndo => DateTime.now().difference(time).inSeconds < 60;
}

class ExpenseProvider extends ChangeNotifier {
  List<Expense> _expenses = [];
  bool _loading = false;
  String? _error;
  LastAction? _lastAction;
  Map<String, dynamic> _stats = {};
  bool _statsLoading = false;

  List<Expense> get expenses => _expenses;
  bool get loading => _loading;
  String? get error => _error;
  Map<String, dynamic> get stats => _stats;
  bool get statsLoading => _statsLoading;
  bool get canUndo => _lastAction?.canUndo == true;

  Future<void> loadExpenses() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _expenses = await ApiService.getRows();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> addExpense({
    required String name,
    required String detail,
    required int amount,
  }) async {
    try {
      final res = await ApiService.addRow(name: name, detail: detail, amount: amount);
      if (res['success'] == true) {
        _lastAction = LastAction((res['rowIndex'] as num).toInt(), 1);
        await loadExpenses();
        return true;
      }
      _error = res['error']?.toString();
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> splitBill({
    required String detail,
    required int amount,
    required List<String> people,
  }) async {
    try {
      final res = await ApiService.addSplit(detail: detail, amount: amount, people: people);
      if (res['success'] == true) {
        _lastAction = LastAction(
          (res['firstRow'] as num).toInt(),
          (res['rowsAdded'] as num).toInt(),
        );
        await loadExpenses();
        return true;
      }
      _error = res['error']?.toString();
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> paidByOther({
    required String payer,
    required String detail,
    required int amount,
  }) async {
    try {
      final res = await ApiService.addPaidBy(payer: payer, detail: detail, amount: amount);
      if (res['success'] == true) {
        _lastAction = LastAction((res['firstRow'] as num).toInt(), 2);
        await loadExpenses();
        return true;
      }
      _error = res['error']?.toString();
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> undoLast() async {
    if (_lastAction == null || !_lastAction!.canUndo) return false;
    try {
      final res = await ApiService.deleteRow(
        rowIndex: _lastAction!.rowIndex,
        count: _lastAction!.count,
      );
      if (res['success'] == true) {
        _lastAction = null;
        await loadExpenses();
        return true;
      }
      return false;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> loadStats({required String month, required String year}) async {
    _statsLoading = true;
    notifyListeners();
    try {
      final res = await ApiService.getStats(month: month, year: year);
      if (res['success'] == true) _stats = res;
    } catch (e) {
      _error = e.toString();
    } finally {
      _statsLoading = false;
      notifyListeners();
    }
  }
}
