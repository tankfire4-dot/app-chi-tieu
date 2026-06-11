import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/expense_provider.dart';
import 'services/storage_service.dart';
import 'screens/home_screen.dart';
import 'screens/setup_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final isConfigured = await StorageService.isConfigured();

  runApp(
    ChangeNotifierProvider(
      create: (_) => ExpenseProvider(),
      child: AppChiTieu(isConfigured: isConfigured),
    ),
  );
}

class AppChiTieu extends StatelessWidget {
  final bool isConfigured;
  const AppChiTieu({super.key, required this.isConfigured});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Chi Tiêu',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1B6B4A)),
        useMaterial3: true,
      ),
      home: isConfigured ? const HomeScreen() : const SetupScreen(),
    );
  }
}
