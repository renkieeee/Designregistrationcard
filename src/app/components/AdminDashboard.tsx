import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../utils/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface Member {
  member_id: string;
  member_number: string;
  first_name: string;
  last_name: string;
  email: string;
  enrollment_date: string;
  loyalty_points?: {
    current_balance: number;
    lifetime_earned: number;
  };
}

interface LoyaltyTransaction {
  transaction_id: string;
  member_id: string;
  points: number;
  transaction_type: string;
  transaction_date: string;
  loyalty_members?: {
    first_name: string;
    last_name: string;
    member_number: string;
  };
}

interface TierDistribution {
  gold: number;
  silver: number;
  bronze: number;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [redemptions, setRedemptions] = useState<LoyaltyTransaction[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
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

      // Fetch all loyalty members with their points balance
      const { data: membersData, error: membersError } = await supabase
        .from('loyalty_members')
        .select('*, loyalty_points(current_balance)')
        .order('enrollment_date', { ascending: false });

      if (membersError) {
        throw membersError;
      }

      // Fetch all redemptions from loyalty_transactions table
      const { data: redemptionsData, error: redemptionsError } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('transaction_type', 'REDEEM');

      if (redemptionsError) {
        // If the table doesn't exist yet, just set empty array
        console.warn('Loyalty transactions table may not exist yet:', redemptionsError);
        setRedemptions([]);
      } else {
        setRedemptions(redemptionsData || []);
      }

      // Fetch all transactions with member info (SCRUM-119 & SCRUM-93)
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('loyalty_transactions')
        .select('*, loyalty_members(first_name, last_name, member_number)')
        .order('transaction_date', { ascending: false });

      if (transactionsError) {
        // If the table doesn't exist yet, just set empty array
        console.warn('Loyalty transactions table may not exist yet:', transactionsError);
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

  const calculateMetrics = (membersData: Member[], redemptionsData: LoyaltyTransaction[]) => {
    // SCRUM-107: Total Members
    const total = membersData.length;
    setTotalMembers(total);

    // SCRUM-113: Points Liability (sum of all current_points_balance)
    const liability = membersData.reduce((sum, member) => {
      return sum + (member.loyalty_points?.current_balance || 0);
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
        const balance = member.loyalty_points?.current_balance || 0;
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
      const memberNumber = transaction.loyalty_members?.member_number || 'N/A';
      const memberName = transaction.loyalty_members
        ? `${transaction.loyalty_members.first_name} ${transaction.loyalty_members.last_name}`
        : 'Unknown';
      const date = new Date(transaction.transaction_date).toLocaleDateString();
      const type = transaction.transaction_type;
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

  // Logout function
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
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
    <div className="flex min-h-screen w-screen" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#0f172a] flex flex-col">
        {/* Brand Header */}
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white">LoyaltyHub</h1>
          <p className="text-xs text-gray-400 mt-1">Admin Portal</p>
        </div>

        {/* Admin Profile */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#06b6d4] rounded-full flex items-center justify-center text-white font-bold text-lg">
              A
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Admin User</p>
              <p className="text-gray-400 text-xs">Administrator</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {/* Dashboard - Active */}
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-[#1e293b] text-white rounded-lg font-medium text-sm transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>

            {/* Members */}
            <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-[#1e293b] hover:text-white rounded-lg font-medium text-sm transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Members
            </button>

            {/* Activity */}
            <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-[#1e293b] hover:text-white rounded-lg font-medium text-sm transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Activity
            </button>

            {/* Rewards */}
            <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-[#1e293b] hover:text-white rounded-lg font-medium text-sm transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              Rewards
            </button>

            {/* Settings */}
            <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-[#1e293b] hover:text-white rounded-lg font-medium text-sm transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-700">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-red-900 hover:text-white rounded-lg font-medium text-sm transition-colors"
            onClick={handleLogout}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-gray-100 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard</h1>
            <p className="text-gray-600 text-lg">Loyalty Program Analytics & Reports</p>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Members - SCRUM-107 */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
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
            <div className="bg-white rounded-2xl p-6 shadow-md">
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
            <div className="bg-white rounded-2xl p-6 shadow-md">
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

          {/* Grid Layout: Tables (2/3 width) + Chart (1/3 width) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Tables (2/3 width) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Recent Members Table */}
              <div className="bg-white rounded-2xl p-8 shadow-md">
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
                        const balance = member.loyalty_points?.current_balance || 0;
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
                          <tr key={member.member_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
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
                              {new Date(member.enrollment_date).toLocaleDateString()}
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
              <div className="bg-white rounded-2xl p-8 shadow-md">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-1">Recent Points Activity</h2>
                    <p className="text-gray-600 flex gap-2 items-center">
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
                    Download CSV
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
                        const memberNumber = transaction.loyalty_members?.member_number || 'N/A';
                        const memberName = transaction.loyalty_members
                          ? `${transaction.loyalty_members.first_name} ${transaction.loyalty_members.last_name}`
                          : 'Unknown';
                        const isEarned = transaction.transaction_type === 'EARN';
                        const typeBadgeColor = isEarned
                          ? 'text-green-700 bg-green-100'
                          : 'text-orange-700 bg-orange-100';

                        return (
                          <tr key={transaction.transaction_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 text-sm text-gray-700">
                              {new Date(transaction.transaction_date).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-4 text-sm font-medium text-gray-800">{memberNumber}</td>
                            <td className="py-4 px-4 text-sm text-gray-700">{memberName}</td>
                            <td className="py-4 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${typeBadgeColor}`}>
                                {transaction.transaction_type}
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

            {/* Right Column: Rewards Summary Chart (1/3 width) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-8 shadow-md sticky top-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Rewards & Member Distribution</h2>
                
                {totalTierMembers > 0 ? (
                  <>
                    <div className="h-80 mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Gold', value: tierDistribution.gold, color: '#f59e0b' },
                              { name: 'Silver', value: tierDistribution.silver, color: '#64748b' },
                              { name: 'Bronze', value: tierDistribution.bronze, color: '#f97316' },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill="#f59e0b" />
                            <Cell fill="#64748b" />
                            <Cell fill="#f97316" />
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [`${value} members`, '']}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '0.75rem',
                              padding: '8px 12px',
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value, entry: any) => (
                              <span className="text-sm font-medium text-gray-700">
                                {value} ({entry.payload.value})
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Summary Stats */}
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-amber-500 rounded"></div>
                          <span className="text-sm font-medium text-gray-700">Gold Tier</span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-800">{tierDistribution.gold}</p>
                          <p className="text-xs text-gray-500">
                            {totalTierMembers > 0 ? Math.round((tierDistribution.gold / totalTierMembers) * 100) : 0}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-slate-500 rounded"></div>
                          <span className="text-sm font-medium text-gray-700">Silver Tier</span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-800">{tierDistribution.silver}</p>
                          <p className="text-xs text-gray-500">
                            {totalTierMembers > 0 ? Math.round((tierDistribution.silver / totalTierMembers) * 100) : 0}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-orange-500 rounded"></div>
                          <span className="text-sm font-medium text-gray-700">Bronze Tier</span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-800">{tierDistribution.bronze}</p>
                          <p className="text-xs text-gray-500">
                            {totalTierMembers > 0 ? Math.round((tierDistribution.bronze / totalTierMembers) * 100) : 0}%
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700">Total Members</span>
                          <span className="text-xl font-bold text-gray-800">{totalTierMembers}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-sm">No data available</p>
                    <p className="text-xs mt-1">Chart will appear when members are registered</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}