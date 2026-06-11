import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/constants.dart';
import '../models/expense.dart';
import 'storage_service.dart';

class ApiService {
  static Future<String> _getUrl() async {
    final url = await StorageService.getUrl();
    if (url == null || url.isEmpty) throw Exception('Chưa cấu hình URL');
    return url;
  }

  static Future<Map<String, dynamic>> _get(Map<String, String> params) async {
    final baseUrl = await _getUrl();
    final uri = Uri.parse(baseUrl).replace(
      queryParameters: {'token': AppConstants.apiToken, ...params},
    );
    final response = await http.get(uri).timeout(const Duration(seconds: 30));
    if (response.statusCode != 200) throw Exception('HTTP ${response.statusCode}');
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  // Kiểm tra kết nối khi setup
  static Future<bool> testConnection(String url) async {
    final uri = Uri.parse(url).replace(
      queryParameters: {'token': AppConstants.apiToken, 'action': 'getPeople'},
    );
    final response = await http.get(uri).timeout(const Duration(seconds: 15));
    if (response.statusCode != 200) return false;
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return data['success'] == true;
  }

  static Future<List<Expense>> getRows({int limit = 80}) async {
    final data = await _get({'action': 'getRows', 'limit': limit.toString()});
    if (data['success'] != true) throw Exception(data['error']);
    final rows = (data['rows'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    return rows.map(Expense.fromJson).toList();
  }

  static Future<Map<String, dynamic>> addRow({
    required String name,
    required String detail,
    required int amount,
  }) async {
    return _get({'action': 'addRow', 'name': name, 'detail': detail, 'amount': amount.toString()});
  }

  static Future<Map<String, dynamic>> addSplit({
    required String detail,
    required int amount,
    required List<String> people,
  }) async {
    return _get({
      'action': 'addSplit',
      'detail': detail,
      'amount': amount.toString(),
      'people': people.join('|'),
    });
  }

  static Future<Map<String, dynamic>> addPaidBy({
    required String payer,
    required String detail,
    required int amount,
  }) async {
    return _get({
      'action': 'addPaidBy',
      'payer': payer,
      'detail': detail,
      'amount': amount.toString(),
    });
  }

  static Future<Map<String, dynamic>> deleteRow({
    required int rowIndex,
    required int count,
  }) async {
    return _get({
      'action': 'deleteRow',
      'rowIndex': rowIndex.toString(),
      'count': count.toString(),
    });
  }

  static Future<Map<String, dynamic>> getStats({
    required String month,
    required String year,
  }) async {
    return _get({'action': 'getStats', 'month': month, 'year': year});
  }
}
