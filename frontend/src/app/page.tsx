"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { z } from "zod";
import {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  Upload,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
  Clock,
  AlertCircle,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Wallet,
  Calendar,
  Building2,
  Filter,
  Search,
  MoreVertical,
  Download,
  Eye,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8000";

// Validation Schema
const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  category: z.enum(["FOOD", "TRANSPORTATION", "OFFICE_SUPPLIES", "MEETINGS", "CONFERENCES", "TRAVEL", "OTHER"]),
  expense_date: z.string().min(1, "Date is required"),
  employee_id: z.number().int().positive("Employee ID is required"),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface Expense {
  id: number;
  amount: number;
  description: string;
  category: string;
  status: string;
  employee_name?: string;
  employee_id: number;
  created_at: string;
  requires_bill: boolean;
  bill_url?: string;
}

interface DashboardStats {
  total_expenses: number;
  total_amount: number;
  pending_count: number;
  approved_count: number;
  auto_approved_count: number;
  rejected_count: number;
  pending_bills: number;
}

const categoryConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  FOOD: { icon: <span className="text-lg">🍽️</span>, label: "Food & Dining", color: "text-orange-400" },
  TRANSPORTATION: { icon: <span className="text-lg">🚗</span>, label: "Transportation", color: "text-blue-400" },
  OFFICE_SUPPLIES: { icon: <span className="text-lg">📎</span>, label: "Office Supplies", color: "text-violet-400" },
  MEETINGS: { icon: <span className="text-lg">🤝</span>, label: "Meetings", color: "text-emerald-400" },
  CONFERENCES: { icon: <span className="text-lg">🎤</span>, label: "Conferences", color: "text-pink-400" },
  TRAVEL: { icon: <span className="text-lg">✈️</span>, label: "Travel", color: "text-sky-400" },
  OTHER: { icon: <span className="text-lg">📋</span>, label: "Other", color: "text-slate-400" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  AUTO_APPROVED: { label: "Auto Approved", className: "badge-auto" },
  APPROVED: { label: "Approved", className: "badge-approved" },
  PENDING: { label: "Pending", className: "badge-pending" },
  REJECTED: { label: "Rejected", className: "badge-rejected" },
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "expenses" | "submit">("dashboard");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_date: new Date().toISOString().split('T')[0],
      employee_id: 1,
    }
  });

  const watchedAmount = watch("amount");
  const requiresBill = watchedAmount >= 6000;

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [expensesRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/expenses/`),
        axios.get(`${API_BASE_URL}/api/dashboard/summary`),
      ]);
      setExpenses(expensesRes.data);
      setStats(statsRes.data.summary);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onSubmit = async (data: ExpenseFormData) => {
    setLoading(true);
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '1' : '1';
      
      const formData = new FormData();
      formData.append("description", data.description);
      formData.append("amount", data.amount.toString());
      formData.append("category", data.category);
      formData.append("expense_date", data.expense_date);
      formData.append("employee_id", data.employee_id.toString());
      formData.append("created_by", userId);

      await axios.post(`${API_BASE_URL}/api/expenses/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showNotification(
        data.amount < 6000
          ? "Expense submitted and auto-approved!"
          : "Expense submitted! Bill upload required for approval."
      );
      reset();
      fetchData();
      setActiveTab("expenses");
    } catch (error: any) {
      showNotification(error.response?.data?.detail || "Failed to submit expense", "error");
    } finally {
      setLoading(false);
    }
  };

  const openUploadModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setSelectedFile(null);
    setUploadModalOpen(true);
    // Auto-trigger file picker
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const uploadBill = async () => {
    if (!selectedFile || !selectedExpense) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("bill", selectedFile);

    try {
      await axios.post(
        `${API_BASE_URL}/api/expenses/${selectedExpense.id}/upload-bill`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      showNotification("Bill uploaded successfully!");
      setUploadModalOpen(false);
      setSelectedFile(null);
      setSelectedExpense(null);
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.detail || "Failed to upload bill", "error");
    } finally {
      setLoading(false);
    }
  };

  const approveExpense = async (expenseId: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/expenses/${expenseId}/approve?approver_id=1`);
      showNotification("Expense approved!");
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.detail || "Failed to approve", "error");
    }
  };

  const rejectExpense = async (expenseId: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/expenses/${expenseId}/reject`);
      showNotification("Expense rejected");
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.detail || "Failed to reject", "error");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filteredExpenses = filterStatus
    ? expenses.filter((e) => e.status === filterStatus)
    : expenses;

  const NavItem = ({ id, icon: Icon, label, badge }: { id: typeof activeTab; icon: any; label: string; badge?: number }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setSidebarOpen(false);
      }}
      className={`sidebar-item w-full ${activeTab === id ? 'active' : ''}`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
      {badge && badge > 0 && (
        <span className="ml-auto bg-violet-500 text-white text-xs px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-[#0a0a0f] to-[#141419] border-r border-white/[0.05] transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Wallet className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-100">ReimburseSys</h1>
              <p className="text-xs text-slate-500">Enterprise</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-4">Main Menu</div>
            <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem id="expenses" icon={Receipt} label="Expenses" badge={expenses.filter(e => e.status === "PENDING").length} />
            <NavItem id="submit" icon={PlusCircle} label="Submit New" />
          </nav>

          {/* Stats Summary in Sidebar */}
          <div className="mt-8">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-4">Quick Stats</div>
            <div className="space-y-2 px-2">
              <div className="glass-card p-3">
                <div className="text-xs text-slate-400">Total Expenses</div>
                <div className="text-xl font-bold text-slate-100">{stats?.total_expenses || 0}</div>
              </div>
              <div className="glass-card p-3">
                <div className="text-xs text-slate-400">Pending</div>
                <div className="text-xl font-bold text-amber-400">{stats?.pending_count || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/[0.05]">
          <button className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-slate-200">Admin User</div>
              <div className="text-xs text-slate-500">admin@company.com</div>
            </div>
            <LogOut size={16} className="text-slate-500" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/[0.05] bg-[#0a0a0f]/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-semibold text-slate-100">
              {activeTab === "dashboard" && "Dashboard Overview"}
              {activeTab === "expenses" && "All Expenses"}
              {activeTab === "submit" && "Submit Expense"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
              <Calendar size={14} />
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          {/* Notification */}
          {notification && (
            <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
              <div className={`px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 ${
                notification.type === "success" 
                  ? "bg-emerald-500/90 backdrop-blur text-white border border-emerald-400/30" 
                  : "bg-rose-500/90 backdrop-blur text-white border border-rose-400/30"
              }`}>
                {notification.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span className="font-medium">{notification.message}</span>
                <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Upload Modal */}
          {uploadModalOpen && selectedExpense && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="glass-card w-full max-w-md p-6 animate-scale-in">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-100">Upload Bill Receipt</h3>
                  <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 mb-6">
                  <div className="text-sm text-slate-400 mb-1">Expense</div>
                  <div className="font-semibold text-slate-100">{selectedExpense.description}</div>
                  <div className="text-violet-400 font-bold text-lg">{formatCurrency(selectedExpense.amount)}</div>
                </div>

                <div 
                  className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-violet-500/50 hover:bg-white/[0.02] transition-all cursor-pointer mb-6"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Upload size={40} className="mx-auto text-slate-500 mb-3" />
                  {selectedFile ? (
                    <div>
                      <p className="text-violet-400 font-medium">{selectedFile.name}</p>
                      <p className="text-slate-500 text-sm">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-slate-300 font-medium mb-1">Click to select file</p>
                      <p className="text-slate-500 text-sm">PDF, JPG, PNG (max 10MB)</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setUploadModalOpen(false)} 
                    className="flex-1 py-3 border border-white/10 rounded-xl text-slate-300 hover:bg-white/5 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={uploadBill} 
                    disabled={!selectedFile || loading}
                    className="flex-1 btn-primary py-3 disabled:opacity-50"
                  >
                    {loading ? "Uploading..." : "Upload Bill"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && stats && (
            <div className="space-y-6 animate-fade-in">
              {/* Welcome Banner */}
              <div className="glass-card p-6 lg:p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-cyan-600/10" />
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold text-slate-100 mb-2">
                    Welcome back, <span className="text-gradient-violet">Admin</span>
                  </h3>
                  <p className="text-slate-400 max-w-xl">
                    Manage employee expense reimbursements efficiently. Expenses under ₹6,000 are auto-approved, 
                    while larger expenses require bill verification.
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Expenses", value: stats.total_expenses, icon: Receipt, color: "text-violet-400", bg: "from-violet-500/20" },
                  { label: "Total Amount", value: formatCurrency(stats.total_amount), icon: Wallet, color: "text-emerald-400", bg: "from-emerald-500/20" },
                  { label: "Pending Review", value: stats.pending_count, icon: Clock, color: "text-amber-400", bg: "from-amber-500/20" },
                  { label: "Awaiting Bills", value: stats.pending_bills, icon: Upload, color: "text-rose-400", bg: "from-rose-500/20" },
                ].map((stat, i) => (
                  <div key={i} className="glass-card-hover p-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.bg} to-transparent flex items-center justify-center mb-3`}>
                      <stat.icon size={20} className={stat.color} />
                    </div>
                    <div className="text-2xl font-bold text-slate-100">{stat.value}</div>
                    <div className="text-sm text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Status Breakdown */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Auto Approved", value: stats.auto_approved_count, desc: "Under ₹6,000", color: "blue" },
                  { label: "Approved", value: stats.approved_count, desc: "By manager", color: "emerald" },
                  { label: "Pending", value: stats.pending_count, desc: "Awaiting action", color: "amber" },
                  { label: "Rejected", value: stats.rejected_count, desc: "Not approved", color: "rose" },
                ].map((item, i) => (
                  <div key={i} className={`glass-card p-4 border-l-2 border-${item.color}-500`}>
                    <div className="text-2xl font-bold text-slate-100">{item.value}</div>
                    <div className="text-sm font-medium text-slate-300">{item.label}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
                  <h3 className="font-bold text-slate-100 flex items-center gap-2">
                    <TrendingUp size={18} className="text-violet-400" />
                    Recent Activity
                  </h3>
                  <button 
                    onClick={() => setActiveTab("expenses")}
                    className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                  >
                    View all <ChevronRight size={14} />
                  </button>
                </div>
                <div className="divide-y divide-white/[0.05]">
                  {expenses.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                          {categoryConfig[expense.category]?.icon}
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">{expense.description}</p>
                          <p className="text-sm text-slate-500">{expense.employee_name || `Employee #${expense.employee_id}`}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-100">{formatCurrency(expense.amount)}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[expense.status]?.className || "bg-slate-500/20 text-slate-400"}`}>
                          {statusConfig[expense.status]?.label || expense.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {expenses.length === 0 && (
                    <div className="p-12 text-center text-slate-500">
                      <Receipt size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No expenses yet. Submit your first!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* EXPENSES TAB */}
          {activeTab === "expenses" && (
            <div className="space-y-6 animate-fade-in">
              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Search expenses..."
                      className="dark-input pl-10 w-64"
                    />
                  </div>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="dark-input"
                  >
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="AUTO_APPROVED">Auto Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
                <button 
                  onClick={() => setActiveTab("submit")}
                  className="btn-primary flex items-center gap-2"
                >
                  <PlusCircle size={18} />
                  New Expense
                </button>
              </div>

              {/* Expenses Table */}
              <div className="glass-card overflow-hidden">
                {filteredExpenses.length === 0 ? (
                  <div className="p-16 text-center">
                    <Receipt size={64} className="mx-auto mb-4 text-slate-600" />
                    <h3 className="text-xl font-semibold text-slate-300 mb-2">No expenses found</h3>
                    <p className="text-slate-500 mb-6">Get started by submitting your first expense</p>
                    <button onClick={() => setActiveTab("submit")} className="btn-primary">
                      Submit Expense
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Description</th>
                          <th>Amount</th>
                          <th>Category</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map((expense) => (
                          <tr key={expense.id}>
                            <td className="font-mono text-slate-400">#{expense.id}</td>
                            <td>
                              <div className="font-medium text-slate-200">{expense.description}</div>
                              <div className="text-sm text-slate-500">{expense.employee_name || `Employee #${expense.employee_id}`}</div>
                            </td>
                            <td className="font-bold text-slate-100">{formatCurrency(expense.amount)}</td>
                            <td>
                              <span className="flex items-center gap-2">
                                {categoryConfig[expense.category]?.icon}
                                <span className="text-slate-300 text-sm">{categoryConfig[expense.category]?.label}</span>
                              </span>
                            </td>
                            <td>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig[expense.status]?.className || "bg-slate-500/20 text-slate-400"}`}>
                                {statusConfig[expense.status]?.label || expense.status}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                {/* Upload Bill Button - Always visible when required */}
                                {expense.requires_bill && !expense.bill_url && (
                                  <button 
                                    onClick={() => openUploadModal(expense)} 
                                    className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-1.5 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                                  >
                                    <Upload size={14} />
                                    Upload
                                  </button>
                                )}
                                {/* Approve/Reject - Only when pending AND bill uploaded */}
                                {expense.status === "PENDING" && expense.bill_url && (
                                  <>
                                    <button 
                                      onClick={() => approveExpense(expense.id)} 
                                      className="btn-success py-1.5 px-3 text-sm flex items-center gap-1.5"
                                    >
                                      <CheckCircle size={14} />
                                      Approve
                                    </button>
                                    <button 
                                      onClick={() => rejectExpense(expense.id)} 
                                      className="btn-danger py-1.5 px-3 text-sm flex items-center gap-1.5"
                                    >
                                      <XCircle size={14} />
                                      Reject
                                    </button>
                                  </>
                                )}
                                {/* View Bill */}
                                {expense.bill_url && (
                                  <a 
                                    href={`${API_BASE_URL}${expense.bill_url}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-1.5"
                                  >
                                    <Eye size={14} />
                                    View
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBMIT TAB */}
          {activeTab === "submit" && (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="glass-card p-6 lg:p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <PlusCircle className="text-white" size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-100">Submit New Expense</h2>
                    <p className="text-slate-400">Create a new reimbursement request</p>
                  </div>
                </div>

                {/* Rules Banner */}
                <div className="bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 rounded-xl p-5 mb-8">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-violet-400 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm text-slate-300">
                        <strong className="text-slate-100">Reimbursement Rules:</strong> Expenses under{" "}
                        <span className="text-emerald-400 font-bold">₹6,000</span> are auto-approved. 
                        Expenses of <span className="text-amber-400 font-bold">₹6,000 or more</span> require 
                        bill upload for approval.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bill Warning */}
                {requiresBill && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-8 flex items-center gap-3 text-amber-400">
                    <Upload size={20} />
                    <div>
                      <span className="font-semibold">Bill Upload Required</span>
                      <p className="text-sm text-amber-300/70">This expense amount requires a receipt for approval</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Description <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      {...register("description")} 
                      className="dark-input w-full"
                      placeholder="e.g., Business lunch with client"
                    />
                    {errors.description && (
                      <p className="mt-1.5 text-sm text-rose-400 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Amount (₹) <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          {...register("amount", { valueAsNumber: true })} 
                          className="dark-input w-full pl-8"
                          placeholder="0.00"
                        />
                      </div>
                      {errors.amount && (
                        <p className="mt-1.5 text-sm text-rose-400 flex items-center gap-1">
                          <AlertCircle size={12} /> {errors.amount.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Category <span className="text-rose-400">*</span>
                      </label>
                      <select {...register("category")} className="dark-input w-full">
                        <option value="">Select category</option>
                        {Object.entries(categoryConfig).map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="mt-1.5 text-sm text-rose-400 flex items-center gap-1">
                          <AlertCircle size={12} /> {errors.category.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                      <input 
                        type="date" 
                        {...register("expense_date")} 
                        className="dark-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Employee ID</label>
                      <input 
                        type="number" 
                        {...register("employee_id", { valueAsNumber: true })} 
                        className="dark-input w-full"
                        placeholder="Enter employee ID"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full btn-primary py-4 text-lg"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <PlusCircle size={20} />
                        Submit Expense
                      </span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#141419] border-t border-white/[0.05] px-4 py-2 z-40">
        <div className="flex items-center justify-around">
          {[
            { id: "dashboard", icon: LayoutDashboard, label: "Home" },
            { id: "expenses", icon: Receipt, label: "Expenses" },
            { id: "submit", icon: PlusCircle, label: "Submit" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as typeof activeTab)}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${
                activeTab === item.id 
                  ? "text-violet-400" 
                  : "text-slate-500"
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? "text-violet-400" : ""} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile Padding for Bottom Nav */}
      <div className="lg:hidden h-16" />
    </div>
  );
}
