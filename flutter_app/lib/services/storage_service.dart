import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const _keyUrl = 'apps_script_url';

  static Future<String?> getUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyUrl);
  }

  static Future<void> saveUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyUrl, url.trim());
  }

  static Future<bool> isConfigured() async {
    final url = await getUrl();
    return url != null && url.isNotEmpty;
  }

  static Future<void> clearUrl() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyUrl);
  }
}
