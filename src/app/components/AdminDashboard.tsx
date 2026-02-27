import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase/client';

interface Member {
  id: string;
  member_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  current_points_balance: number;
  created_at: string;
}

interface PointsTransaction {
  id: string;
  member_id: string;
  points: number;
  type: string;
  description: string;
  created_at: string;
  loyalty_members?: {
    first_name: string;
    last_name: string;
  };
}

interface TierDistribution {
  gold: number;
  silver: number;
  bronze: number;
}

export function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [redemptions, setRedemptions] = useState<PointsTransaction[]>([]);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculated metrics
  const [totalMembers, setTotalMembers] = useState(0);
  const [pointsLiability, setPointsLiability] = useState(0);
  const [totalPointsRedeemed, setTotalPointsRedeemed] = useState(0);
  const [tierDistribution, setTierDistribution] = useState<TierDistribution>({
    gold: 0,
    silver: 0,
    bronze: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all loyalty members
      const { data: membersData, error: membersError } = await supabase
        .from('loyalty_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (membersError) {
        throw membersError;
      }

      // Fetch all redemptions from points_transactions table
      const { data: redemptionsData, error: redemptionsError } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('type', 'REDEEMED');

      if (redemptionsError) {
        // If the table doesn't exist yet, just set empty array
        console.warn('Points transactions table may not exist yet:', redemptionsError);
        setRedemptions([]);
      } else {
        setRedemptions(redemptionsData || []);
      }

      // Fetch all transactions from points_transactions table with member info (SCRUM-119 & SCRUM-93)
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('points_transactions')
        .select('*, loyalty_members(first_name, last_name)')
        .order('created_at', { ascending: false });

      if (transactionsError) {
        // If the table doesn't exist yet, just set empty array
        console.warn('Points transactions table may not exist yet:', transactionsError);
        setTransactions([]);
      } else {
        setTransactions(transactionsData || []);
      }

      setMembers(membersData || []);

      // Calculate metrics
      calculateMetrics(membersData || [], redemptionsData || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (membersData: Member[], redemptionsData: PointsTransaction[]) => {
    // SCRUM-107: Total Members
    const total = membersData.length;
    setTotalMembers(total);

    // SCRUM-113: Points Liability (sum of all current_points_balance)
    const liability = membersData.reduce((sum, member) => {
      return sum + (member.current_points_balance || 0);
    }, 0);
    setPointsLiability(liability);

    // SCRUM-125: Total Points Redeemed
    const redeemed = redemptionsData.reduce((sum, transaction) => {
      return sum + (transaction.points || 0);
    }, 0);
    setTotalPointsRedeemed(redeemed);

    // SCRUM-98 & 130: Tier Distribution
    const tiers = membersData.reduce(
      (acc, member) => {
        const balance = member.current_points_balance || 0;
        if (balance >= 1000) {
          acc.gold++;
        } else if (balance >= 500) {
          acc.silver++;
        } else {
          acc.bronze++;
        }
        return acc;
      },
      { gold: 0, silver: 0, bronze: 0 }
    );
    setTierDistribution(tiers);
  };

  // SCRUM-93: CSV Download Function
  const downloadStatement = () => {
    if (transactions.length === 0) {
      alert('No transactions available to download');
      return;
    }

    // Create CSV header
    const header = 'Date,Member Number,Member Name,Type,Points\n';

    // Create CSV rows
    const rows = transactions.map((transaction) => {
      // Find the member to get member_number
      const member = members.find(m => m.id === transaction.member_id);
      const memberNumber = member?.member_number || 'N/A';
      const memberName = transaction.loyalty_members
        ? `${transaction.loyalty_members.first_name} ${transaction.loyalty_members.last_name}`
        : 'Unknown';
      const date = new Date(transaction.created_at).toLocaleDateString();
      const type = transaction.type;
      const points = transaction.points;

      return `${date},${memberNumber},"${memberName}",${type},${points}`;
    }).join('\n');

    const csvContent = header + rows;

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'points_statement.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-white text-xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="bg-red-50 text-red-800 p-6 rounded-xl max-w-md" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const totalTierMembers = tierDistribution.gold + tierDistribution.silver + tierDistribution.bronze;

  return (
    <div className="min-h-screen bg-[#0f172a] p-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-400 text-lg">Loyalty Program Analytics & Reports</p>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Members - SCRUM-107 */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#06b6d4] bg-opacity-10 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-[#06b6d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500 font-medium">SCRUM-107</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Members</h3>
            <p className="text-4xl font-bold text-gray-800">{totalMembers.toLocaleString()}</p>
          </div>

          {/* Points Liability - SCRUM-113 */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-500 bg-opacity-10 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500 font-medium">SCRUM-113</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Points Liability</h3>
            <p className="text-4xl font-bold text-gray-800">{pointsLiability.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Total unredeemed points</p>
          </div>

          {/* Total Points Redeemed - SCRUM-125 */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500 bg-opacity-10 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500 font-medium">SCRUM-125</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Points Redeemed</h3>
            <p className="text-4xl font-bold text-gray-800">{totalPointsRedeemed.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">All-time redemptions</p>
          </div>
        </div>

        {/* Tier Distribution Section - SCRUM-98 & 130 */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Tier Distribution</h2>
              <p className="text-gray-500">Member segmentation by points balance</p>
            </div>
            <div className="flex gap-2 text-xs text-gray-500">
              <span className="font-medium">SCRUM-98</span>
              <span>•</span>
              <span className="font-medium">SCRUM-130</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gold Tier */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 border-2 border-amber-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Gold Tier</h3>
                  <p className="text-xs text-gray-600">≥ 1,000 points</p>
                </div>
              </div>
              <p className="text-5xl font-bold text-amber-600 mb-3">{tierDistribution.gold}</p>
              <div className="w-full bg-amber-200 rounded-full h-3 mb-2">
                <div
                  className="bg-gradient-to-r from-amber-400 to-yellow-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: totalTierMembers > 0 ? `${(tierDistribution.gold / totalTierMembers) * 100}%` : '0%' }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {totalTierMembers > 0 ? Math.round((tierDistribution.gold / totalTierMembers) * 100) : 0}% of all members
              </p>
            </div>

            {/* Silver Tier */}
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-6 border-2 border-slate-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-gray-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Silver Tier</h3>
                  <p className="text-xs text-gray-600">500-999 points</p>
                </div>
              </div>
              <p className="text-5xl font-bold text-slate-600 mb-3">{tierDistribution.silver}</p>
              <div className="w-full bg-slate-300 rounded-full h-3 mb-2">
                <div
                  className="bg-gradient-to-r from-slate-400 to-gray-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: totalTierMembers > 0 ? `${(tierDistribution.silver / totalTierMembers) * 100}%` : '0%' }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {totalTierMembers > 0 ? Math.round((tierDistribution.silver / totalTierMembers) * 100) : 0}% of all members
              </p>
            </div>

            {/* Bronze Tier */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border-2 border-orange-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Bronze Tier</h3>
                  <p className="text-xs text-gray-600">&lt; 500 points</p>
                </div>
              </div>
              <p className="text-5xl font-bold text-orange-600 mb-3">{tierDistribution.bronze}</p>
              <div className="w-full bg-orange-300 rounded-full h-3 mb-2">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: totalTierMembers > 0 ? `${(tierDistribution.bronze / totalTierMembers) * 100}%` : '0%' }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {totalTierMembers > 0 ? Math.round((tierDistribution.bronze / totalTierMembers) * 100) : 0}% of all members
              </p>
            </div>
          </div>
        </div>

        {/* Recent Members Table */}
        <div className="bg-white rounded-2xl p-8 shadow-xl mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Members</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Member #</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Points</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tier</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.slice(0, 10).map((member) => {
                  const balance = member.current_points_balance || 0;
                  let tier = 'Bronze';
                  let tierColor = 'text-orange-600 bg-orange-100';
                  if (balance >= 1000) {
                    tier = 'Gold';
                    tierColor = 'text-amber-600 bg-amber-100';
                  } else if (balance >= 500) {
                    tier = 'Silver';
                    tierColor = 'text-slate-600 bg-slate-100';
                  }

                  return (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 text-sm font-medium text-gray-800">{member.member_number}</td>
                      <td className="py-4 px-4 text-sm text-gray-700">{member.first_name} {member.last_name}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{member.email}</td>
                      <td className="py-4 px-4 text-sm font-semibold text-gray-800">{balance.toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tierColor}`}>
                          {tier}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {members.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No members found. Register your first member to get started!
              </div>
            )}
          </div>
        </div>

        {/* Member Activity Report - SCRUM-119 & SCRUM-93 */}
        <div className="bg-white rounded-2xl p-8 shadow-xl mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Recent Points Activity</h2>
              <p className="text-gray-500 flex gap-2 items-center">
                <span>Complete transaction history</span>
                <span>•</span>
                <span className="text-xs font-medium">SCRUM-119</span>
                <span>•</span>
                <span className="text-xs font-medium">SCRUM-93</span>
              </p>
            </div>
            <button
              onClick={downloadStatement}
              className="bg-[#06b6d4] hover:bg-[#0891b2] text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Statement (CSV)
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Member #</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Member Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Points</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 20).map((transaction) => {
                  const member = members.find(m => m.id === transaction.member_id);
                  const memberNumber = member?.member_number || 'N/A';
                  const memberName = transaction.loyalty_members
                    ? `${transaction.loyalty_members.first_name} ${transaction.loyalty_members.last_name}`
                    : 'Unknown';
                  const isEarned = transaction.type === 'EARNED';
                  const typeBadgeColor = isEarned
                    ? 'text-green-700 bg-green-100'
                    : 'text-orange-700 bg-orange-100';

                  return (
                    <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-gray-800">{memberNumber}</td>
                      <td className="py-4 px-4 text-sm text-gray-700">{memberName}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${typeBadgeColor}`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-gray-800">
                        {transaction.points.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No transactions found. Transactions will appear here once members earn or redeem points.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}