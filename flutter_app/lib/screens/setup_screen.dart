import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';
import 'home_screen.dart';

class SetupScreen extends StatefulWidget {
  const SetupScreen({super.key});

  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  final _urlCtrl = TextEditingController();
  bool _testing = false;
  bool _saving = false;
  String? _testResult;
  bool _testOk = false;

  @override
  void dispose() {
    _urlCtrl.dispose();
    super.dispose();
  }

  bool _isValidUrl(String url) {
    return url.trim().startsWith('https://script.google.com/macros/s/');
  }

  Future<void> _testConnection() async {
    final url = _urlCtrl.text.trim();
    if (!_isValidUrl(url)) {
      setState(() {
        _testResult = 'URL không đúng định dạng — phải bắt đầu bằng https://script.google.com/macros/s/';
        _testOk = false;
      });
      return;
    }

    setState(() { _testing = true; _testResult = null; });

    try {
      final ok = await ApiService.testConnection(url);
      setState(() {
        _testOk = ok;
        _testResult = ok ? 'Kết nối thành công!' : 'Kết nối thất bại — kiểm tra lại URL hoặc token trong Apps Script';
      });
    } catch (e) {
      setState(() {
        _testOk = false;
        _testResult = 'Lỗi: ${e.toString()}';
      });
    } finally {
      setState(() => _testing = false);
    }
  }

  Future<void> _save() async {
    final url = _urlCtrl.text.trim();
    if (!_isValidUrl(url)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('URL không hợp lệ'),
        backgroundColor: Colors.red,
      ));
      return;
    }

    setState(() => _saving = true);
    await StorageService.saveUrl(url);

    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const HomeScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 32),

              // Icon + tiêu đề
              Icon(Icons.link_rounded, size: 64, color: primary),
              const SizedBox(height: 16),
              Text(
                'Thiết lập lần đầu',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: primary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Nhập URL Apps Script để kết nối với Google Sheet của bạn',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.grey[600]),
              ),

              const SizedBox(height: 36),

              // Hướng dẫn
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.blue[200]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Icon(Icons.info_outline, size: 16, color: Colors.blue[700]),
                      const SizedBox(width: 6),
                      Text('Lấy URL ở đâu?',
                          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue[700], fontSize: 13)),
                    ]),
                    const SizedBox(height: 8),
                    const Text(
                      '1. Mở Google Apps Script của bạn\n'
                      '2. Chọn Deploy → Manage deployments\n'
                      '3. Copy URL Web App\n'
                      '4. Dán vào ô bên dưới',
                      style: TextStyle(fontSize: 12, height: 1.6),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // URL input
              TextField(
                controller: _urlCtrl,
                keyboardType: TextInputType.url,
                autocorrect: false,
                onChanged: (_) => setState(() { _testResult = null; _testOk = false; }),
                decoration: InputDecoration(
                  labelText: 'URL Apps Script',
                  hintText: 'https://script.google.com/macros/s/...',
                  border: const OutlineInputBorder(),
                  suffixIcon: _urlCtrl.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () => setState(() {
                            _urlCtrl.clear();
                            _testResult = null;
                          }),
                        )
                      : null,
                ),
              ),

              const SizedBox(height: 12),

              // Nút test
              OutlinedButton.icon(
                onPressed: _testing ? null : _testConnection,
                icon: _testing
                    ? const SizedBox(width: 14, height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.wifi_tethering, size: 18),
                label: const Text('Kiểm tra kết nối'),
              ),

              // Kết quả test
              if (_testResult != null) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: _testOk ? Colors.green[50] : Colors.red[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _testOk ? Colors.green[300]! : Colors.red[300]!,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _testOk ? Icons.check_circle_outline : Icons.error_outline,
                        size: 16,
                        color: _testOk ? Colors.green[700] : Colors.red[700],
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _testResult!,
                          style: TextStyle(
                            fontSize: 13,
                            color: _testOk ? Colors.green[800] : Colors.red[800],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 24),

              // Nút lưu
              FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox(width: 16, height: 16,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.check),
                label: const Text('Lưu & bắt đầu dùng', style: TextStyle(fontSize: 15)),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
