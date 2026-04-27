"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { z } from "zod";

const API_BASE_URL = "http://localhost:8000";

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

const categoryConfig: Record<string, { icon: string; label: string; gradient: string }> = {
  FOOD: { icon: "🍽️", label: "Food & Dining", gradient: "from-orange-400 to-amber-500" },
  TRANSPORTATION: { icon: "🚗", label: "Transportation", gradient: "from-blue-400 to-cyan-500" },
  OFFICE_SUPPLIES: { icon: "📎", label: "Office Supplies", gradient: "from-violet-400 to-purple-500" },
  MEETINGS: { icon: "🤝", label: "Meetings", gradient: "from-emerald-400 to-teal-500" },
  CONFERENCES: { icon: "🎤", label: "Conferences", gradient: "from-pink-400 to-rose-500" },
  TRAVEL: { icon: "✈️", label: "Travel", gradient: "from-sky-400 to-indigo-500" },
  OTHER: { icon: "📋", label: "Other", gradient: "from-gray-400 to-slate-500" },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "expenses" | "submit">("dashboard");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<ExpenseFormData>({
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
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [expensesRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/expenses/`),
        axios.get(`${API_BASE_URL}/api/dashboard/summary`)
      ]);
      setExpenses(expensesRes.data);
      setStats(statsRes.data.summary);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onSubmit = async (data: ExpenseFormData) => {
    setLoading(true);
    try {
      // Get user ID from localStorage (set during login) or default to 1
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
    // Auto-trigger file picker after modal opens
    setTimeout(() => {
      const fileInput = document.getElementById('bill-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      }
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "AUTO_APPROVED": "bg-gradient-to-r from-blue-500 to-cyan-500 text-white",
      "APPROVED": "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
      "PENDING": "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
      "REJECTED": "bg-gradient-to-r from-rose-500 to-pink-500 text-white",
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${styles[status] || "bg-gray-500 text-white"}`}>
        {status === "AUTO_APPROVED" && "✨"}
        {status === "APPROVED" && "✓"}
        {status === "PENDING" && "⏳"}
        {status === "REJECTED" && "✗"}
        {status.replace('_', ' ')}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-orange-50 to-amber-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <h1 className="text-2xl font-bold">Expense Portal</h1>
                <p className="text-white/80 text-sm">Employee Reimbursement System</p>
              </div>
            </div>
            <nav className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl p-1.5">
              {[
                { id: "dashboard", icon: "📊", label: "Dashboard" },
                { id: "expenses", icon: "📋", label: "Expenses", badge: expenses.filter(e => e.status === "PENDING").length },
                { id: "submit", icon: "➕", label: "Submit" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                    activeTab === tab.id 
                      ? "bg-white text-orange-600 shadow-lg font-semibold" 
                      : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {tab.badge}
                </span>
              )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className="fixed top-24 right-4 z-50 animate-slide-up">
          <div className={`px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 ${
            notification.type === "success" 
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white" 
              : "bg-gradient-to-r from-rose-500 to-pink-500 text-white"
          }`}>
            <span className="text-lg">{notification.type === "success" ? "✓" : "⚠"}</span>
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Bill Upload Modal */}
      {uploadModalOpen && selectedExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Upload Bill</h3>
            <div className="bg-amber-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600">Expense: <span className="font-semibold">{selectedExpense.description}</span></p>
              <p className="text-sm text-gray-600">Amount: <span className="font-semibold text-amber-600">{formatCurrency(selectedExpense.amount)}</span></p>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-400 transition-colors bg-gray-50">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
                id="bill-upload"
              />
              <label htmlFor="bill-upload" className="cursor-pointer block">
                <span className="text-4xl mb-3 block">📤</span>
                <p className="text-gray-600">
                  {selectedFile ? (
                    <span className="text-orange-600 font-semibold">{selectedFile.name}</span>
                  ) : (
                    <span>Click to upload bill <span className="text-gray-400">(PDF, JPG, PNG, max 10MB)</span></span>
                  )}
                </p>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setUploadModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={uploadBill} disabled={!selectedFile} className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed">Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard */}
        {activeTab === "dashboard" && stats && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: "Total Expenses", value: stats.total_expenses.toLocaleString(), icon: "📊", gradient: "from-blue-500 to-cyan-500" },
                { label: "Total Amount", value: formatCurrency(stats.total_amount), icon: "💰", gradient: "from-emerald-500 to-teal-500" },
                { label: "Pending", value: stats.pending_count, icon: "⏳", gradient: "from-amber-500 to-orange-500" },
                { label: "Need Bills", value: stats.pending_bills, icon: "📤", gradient: "from-rose-500 to-pink-500" },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-2xl shadow-lg`}>
                      {stat.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Auto Approved", value: stats.auto_approved_count, color: "blue", desc: "Under ₹6,000" },
                { label: "Approved", value: stats.approved_count, color: "emerald", desc: "By manager" },
                { label: "Pending", value: stats.pending_count, color: "amber", desc: "Awaiting action" },
                { label: "Rejected", value: stats.rejected_count, color: "rose", desc: "Not approved" },
              ].map((item, i) => (
                <div key={i} className={`bg-gradient-to-br from-${item.color}-50 to-${item.color}-100 rounded-2xl p-5 border border-${item.color}-200`}>
                  <p className="text-3xl font-bold text-gray-800">{item.value}</p>
                  <p className="text-sm font-medium text-gray-600 mt-1">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">📅 Recent Activity</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {expenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{categoryConfig[expense.category]?.icon || "📋"}</span>
                      <div>
                        <p className="font-semibold text-gray-800">{expense.description}</p>
                        <p className="text-sm text-gray-500">{expense.employee_name || `Employee #${expense.employee_id}`}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">{formatCurrency(expense.amount)}</p>
                      <div className="mt-1">{getStatusBadge(expense.status)}</div>
                    </div>
                  </div>
                ))}
                {expenses.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                    <span className="text-5xl block mb-3">📋</span>
                    <p>No expenses yet. Submit your first!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expenses List */}
        {activeTab === "expenses" && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg">All Expenses</h2>
              <button onClick={() => setActiveTab("submit")} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-amber-600 transition-all">
                ➕ New Expense
              </button>
            </div>
            {expenses.length === 0 ? (
              <div className="p-16 text-center">
                <span className="text-6xl block mb-4">📋</span>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No expenses yet</h3>
                <p className="text-gray-500 mb-6">Get started by submitting your first expense</p>
                <button onClick={() => setActiveTab("submit")} className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium">
                  Submit Expense
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-800">#{expense.id}</td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800">{expense.description}</p>
                          <p className="text-sm text-gray-500">{expense.employee_name}</p>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-800">{formatCurrency(expense.amount)}</td>
                        <td className="px-6 py-4">{getStatusBadge(expense.status)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {expense.requires_bill && !expense.bill_url && (
                              <button onClick={() => openUploadModal(expense)} className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-xs font-semibold hover:from-amber-600 hover:to-orange-600 transition-all">
                                📤 Upload Bill
                              </button>
                            )}
                            {expense.status === "PENDING" && expense.bill_url && (
                              <>
                                <button onClick={() => approveExpense(expense.id)} className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-xs font-semibold">
                                  ✓ Approve
                                </button>
                                <button onClick={() => rejectExpense(expense.id)} className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg text-xs font-semibold">
                                  ✗ Reject
                                </button>
                              </>
                            )}
                            {expense.bill_url && (
                              <a href={`${API_BASE_URL}${expense.bill_url}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-xs font-semibold">
                                📄 View
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
        )}

        {/* Submit Expense */}
        {activeTab === "submit" && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                  ➕
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Submit New Expense</h2>
                  <p className="text-gray-500">Fill in the details below</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 mb-6">
                <p className="text-sm text-gray-700">📌 <strong>Reimbursement Rules:</strong> Expenses under <span className="text-emerald-600 font-bold">₹6,000</span> are auto-approved. Expenses of <span className="text-amber-600 font-bold">₹6,000 or more</span> require bill upload for approval.</p>
              </div>

              {requiresBill && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-rose-700">
                  <span className="text-2xl">📤</span>
                  <span className="font-semibold">This expense will require bill upload</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description <span className="text-rose-500">*</span></label>
                  <input {...register("description")} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all" placeholder="e.g., Business lunch with client" />
                  {errors.description && <p className="mt-1 text-sm text-rose-600">{errors.description.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹) <span className="text-rose-500">*</span></label>
                    <input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="0.00" />
                    {errors.amount && <p className="mt-1 text-sm text-rose-600">{errors.amount.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category <span className="text-rose-500">*</span></label>
                    <select {...register("category")} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white">
                      <option value="">Select category</option>
                      {Object.entries(categoryConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.icon} {config.label}</option>
                      ))}
                    </select>
                    {errors.category && <p className="mt-1 text-sm text-rose-600">{errors.category.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                    <input type="date" {...register("expense_date")} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Employee ID</label>
                    <input type="number" {...register("employee_id", { valueAsNumber: true })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="Enter employee ID" />
                  </div>
                </div>

            <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold text-lg hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all">
                  {loading ? "⏳ Submitting..." : "✨ Submit Expense"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
