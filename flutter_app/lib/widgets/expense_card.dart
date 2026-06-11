import 'package:flutter/material.dart';
import '../models/expense.dart';

class ExpenseCard extends StatelessWidget {
  final Expense expense;

  const ExpenseCard({super.key, required this.expense});

  Color _avatarColor(String name) {
    const colors = [
      Colors.teal, Colors.blue, Colors.purple, Colors.orange,
      Colors.red, Colors.green, Colors.indigo, Colors.amber,
    ];
    final hash = name.codeUnits.fold(0, (a, b) => a + b);
    return colors[hash % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    final isPositive = expense.amount >= 0;
    final isKhoa = expense.name == 'Khoa';
    final amountColor = isPositive
        ? (isKhoa ? Colors.red[700]! : Colors.orange[700]!)
        : Colors.green[700]!;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      leading: CircleAvatar(
        backgroundColor: _avatarColor(expense.name),
        radius: 20,
        child: Text(
          expense.initials,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 13,
          ),
        ),
      ),
      title: Text(
        expense.detail,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        expense.subcategory.isNotEmpty
            ? '${expense.name} · ${expense.subcategory}'
            : expense.name,
        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Text(
        expense.formattedAmount,
        style: TextStyle(
          color: amountColor,
          fontWeight: FontWeight.bold,
          fontSize: 14,
        ),
      ),
    );
  }
}
