import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import type { MedicalRecord } from '../../types/medical';
import type { InsurancePolicy } from '../../types/insurance';

interface MonthlyCost {
  month: string;
  medical: number;
  insurance: number;
}

function buildMonthlyData(records: MedicalRecord[], policies: InsurancePolicy[]): MonthlyCost[] {
  const map = new Map<string, MonthlyCost>();

  records.forEach((record) => {
    const month = dayjs(record.visitDate).format('YYYY-MM');
    if (!map.has(month)) map.set(month, { month, medical: 0, insurance: 0 });
    map.get(month)!.medical += Number(record.cost || 0);
  });

  policies.forEach((policy) => {
    const start = dayjs(policy.startDate);
    const end = dayjs(policy.endDate);
    const months: string[] = [];
    let cursor = start.startOf('month');
    const endMonth = end.startOf('month');
    while (cursor.isBefore(endMonth) || cursor.isSame(endMonth, 'month')) {
      months.push(cursor.format('YYYY-MM'));
      cursor = cursor.add(1, 'month');
    }
    const monthlyPremium = Number(policy.premium || 0) / Math.max(months.length, 1);
    months.forEach((m) => {
      if (!map.has(m)) map.set(m, { month: m, medical: 0, insurance: 0 });
      map.get(m)!.insurance += monthlyPremium;
    });
  });

  const sorted = Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  if (sorted.length === 0) {
    const now = dayjs();
    for (let i = 5; i >= 0; i--) {
      const m = now.subtract(i, 'month').format('YYYY-MM');
      sorted.push({ month: m, medical: 0, insurance: 0 });
    }
  }
  return sorted;
}

export function ExpenseOverviewChart({ records, policies }: { records: MedicalRecord[]; policies: InsurancePolicy[] }) {
  const data = buildMonthlyData(records, policies);
  const totalMedical = records.reduce((sum, r) => sum + Number(r.cost || 0), 0);
  const totalInsurance = policies.reduce((sum, p) => sum + Number(p.premium || 0), 0);

  return (
    <ReactECharts
      style={{ height: 260 }}
      option={{
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['医疗费用', '保险费用'], top: 0 },
        grid: { left: 36, right: 16, top: 40, bottom: 32 },
        xAxis: { type: 'category', data: data.map((d) => d.month) },
        yAxis: { type: 'value' },
        series: [
          {
            name: '医疗费用',
            type: 'bar',
            stack: 'total',
            data: data.map((d) => Number(d.medical.toFixed(2))),
            itemStyle: { color: '#0f8b8d' },
          },
          {
            name: '保险费用',
            type: 'bar',
            stack: 'total',
            data: data.map((d) => Number(d.insurance.toFixed(2))),
            itemStyle: { color: '#e1a23a' },
          },
        ],
        graphic: [
          {
            type: 'text',
            right: 16,
            top: 4,
            style: {
              text: `医疗总计 ¥${totalMedical.toLocaleString('zh-CN')}  保险总计 ¥${totalInsurance.toLocaleString('zh-CN')}`,
              fontSize: 12,
              fill: '#6f7f7c',
            },
          },
        ],
      }}
    />
  );
}
