import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const monthParam = req.nextUrl.searchParams.get("month");

    // Parse "YYYY-MM" or default to current month
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-indexed

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      year = y;
      month = m - 1;
    }

    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endYear = month === 11 ? year + 1 : year;
    const endMonth = month === 11 ? 1 : month + 2;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const [records, recurring, aggregates] = await Promise.all([
      // All records for the selected month
      sql(
        `SELECT fr.*, fm.name as member_name
         FROM finance_records fr
         LEFT JOIN family_members fm ON fr.related_member_id = fm.id
         WHERE fr.record_date >= $1::date AND fr.record_date < $2::date
         ORDER BY fr.record_date DESC, fr.created_at DESC`,
        [startDate, endDate]
      ),

      // All recurring records (regardless of month)
      sql`SELECT fr.*, fm.name as member_name
          FROM finance_records fr
          LEFT JOIN family_members fm ON fr.related_member_id = fm.id
          WHERE fr.is_recurring = true
          ORDER BY fr.category, fr.title`,

      // Per-month aggregates
      sql(
        `SELECT
           COALESCE(SUM(CASE WHEN category = 'income' THEN amount::numeric ELSE 0 END), 0) as total_income,
           COALESCE(SUM(CASE WHEN category = 'expense' THEN amount::numeric ELSE 0 END), 0) as total_expense,
           COALESCE(SUM(CASE WHEN category = 'investment' THEN amount::numeric ELSE 0 END), 0) as total_investment,
           COALESCE(SUM(CASE WHEN category = 'savings' THEN amount::numeric ELSE 0 END), 0) as total_savings,
           COUNT(*) as record_count
         FROM finance_records
         WHERE record_date >= $1::date AND record_date < $2::date`,
        [startDate, endDate]
      ),
    ]);

    return NextResponse.json({
      records,
      recurring,
      aggregates: aggregates[0] || {
        total_income: 0,
        total_expense: 0,
        total_investment: 0,
        total_savings: 0,
        record_count: 0,
      },
      month: { year, month: month + 1 },
    });
  } catch (err) {
    console.error("Finance API error:", err);
    return NextResponse.json({ error: "Failed to load finance data" }, { status: 500 });
  }
}
