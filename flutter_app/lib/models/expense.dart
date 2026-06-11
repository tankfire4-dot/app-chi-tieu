class Expense {
  final int rowIndex;
  final String date;
  final String name;
  final String category;
  final String subcategory;
  final String detail;
  final int amount;
  final bool collected;

  const Expense({
    required this.rowIndex,
    required this.date,
    required this.name,
    required this.category,
    required this.subcategory,
    required this.detail,
    required this.amount,
    required this.collected,
  });

  factory Expense.fromJson(Map<String, dynamic> json) {
    return Expense(
      rowIndex: (json['rowIndex'] as num?)?.toInt() ?? 0,
      date: json['date']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      subcategory: json['subcategory']?.toString() ?? '',
      detail: json['detail']?.toString() ?? '',
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      collected: json['collected'] == true,
    );
  }

  bool get isNegative => amount < 0;

  String get formattedAmount {
    final abs = amount.abs();
    final s = abs.toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    return (amount < 0 ? '-' : '') + buf.toString() + 'đ';
  }

  String get initials {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '?';
    return parts.last[0].toUpperCase();
  }
}
