"use client"

import {
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts"

const data = [
    { name: "Week 1", score: 75 },
    { name: "Week 2", score: 78 },
    { name: "Week 3", score: 76 },
    { name: "Week 4", score: 82 },
    { name: "Week 5", score: 85 },
    { name: "Week 6", score: 89 },
    { name: "Week 7", score: 87 },
    { name: "Week 8", score: 92 },
]

export function ScoreChart() {
    return (
        <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: 'none' }}
                        itemStyle={{ color: '#111827', fontWeight: 600 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        activeDot={{ r: 6, fill: "#0ea5e9", stroke: "#fff", strokeWidth: 2 }}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
