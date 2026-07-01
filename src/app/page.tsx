'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  User, 
  Users, 
  Phone, 
  DollarSign, 
  Calendar, 
  Check, 
  AlertCircle, 
  Loader2, 
  Layers, 
  MapPin, 
  Utensils, 
  Coffee,
  ListFilter,
  Lock,
  LogOut,
  Plus,
  Trash2,
  TrendingUp,
  Briefcase,
  Download
} from 'lucide-react';

// Configuration definitions without static prices
const PARTNER_TYPES = ['Walk-In', 'Partner', 'Broker'] as const;
type PartnerType = typeof PARTNER_TYPES[number];

const SERVICE_TYPES = [
  { id: 'sunrise-kayaking', name: 'Sunrise Kayaking' },
  { id: 'sunset-kayaking', name: 'Sun Set Kayaking' },
  { id: 'towing', name: 'Towing' },
  { id: 'boating', name: 'Boating' },
  { id: 'fishing', name: 'Fishing' },
  { id: 'custom-package', name: 'Custom Package' },
  { id: 'bioluminescence-boating', name: 'Bioluminescence Boating' },
  { id: 'bioluminescence-kayaking', name: 'Bioluminescence Kayaking' },
] as const;

const ADDONS = [
  { id: 'pickup-drop', name: 'Pickup and drop', icon: MapPin },
  { id: 'food', name: 'Food', icon: Utensils },
  { id: 'refreshment', name: 'Refreshment', icon: Coffee },
] as const;

interface BookingRecord {
  _id: string;
  entryUser: string;
  partner: string;
  name: string;
  mob: string;
  pax: number;
  services: string[];
  addons: string[];
  rate: number;
  advance: number;
  discount: number;
  balance: number;
  commission: number;
  total: number;
  guideStaff: string;
  assistStaff: string;
  customPickupPrice?: number;
  customFoodPrice?: number;
  createdAt: string;
}

interface StaffUser {
  _id: string;
  username: string;
  role: string;
  createdAt: string;
}

type AuthUser = {
  username: string;
  role: 'admin' | 'staff';
} | null;

export default function BookingPortal() {
  // Authentication State
  const [user, setUser] = useState<AuthUser>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  // Dynamic Prices State
  const [prices, setPrices] = useState<{
    services: Record<string, number>;
    addons: Record<string, number>;
  }>({
    services: {
      'sunrise-kayaking': 1200,
      'sunset-kayaking': 1500,
      'towing': 800,
      'boating': 2000,
      'fishing': 2500,
      'custom-package': 0,
      'bioluminescence-boating': 1800,
      'bioluminescence-kayaking': 2200,
    },
    addons: {
      'refreshment': 150,
    }
  });

  // Staff Assignment State
  const [guideStaff, setGuideStaff] = useState('');
  const [assistStaff, setAssistStaff] = useState('');

  // Form Fields State (Staff view)
  const [partner, setPartner] = useState<PartnerType>('Walk-In');
  const [name, setName] = useState('');
  const [mob, setMob] = useState('');
  const [pax, setPax] = useState('1');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [rate, setRate] = useState<string>('');
  const [advance, setAdvance] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [commission, setCommission] = useState<string>('');

  // Custom Pricing Fields for food and pickup-drop (which might be custom total values)
  const [customPickupPrice, setCustomPickupPrice] = useState<string>('');
  const [customFoodPrice, setCustomFoodPrice] = useState<string>('');

  // Admin Dashboard State
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [newStaffUser, setNewStaffUser] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Admin Customizable Prices Form State
  const [priceFormServices, setPriceFormServices] = useState<Record<string, number>>({});
  const [priceFormAddons, setPriceFormAddons] = useState<Record<string, number>>({});

  // General App State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<BookingRecord | null>(null);

  // Load customizable prices from API
  const fetchPrices = async () => {
    try {
      const res = await fetch('/api/prices');
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
        setPriceFormServices(data.services);
        setPriceFormAddons(data.addons);
      }
    } catch (err) {
      console.error('Failed to load prices:', err);
    }
  };

  const fetchBookings = useCallback(async () => {
    setIsLoadingBookings(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setIsLoadingBookings(false);
    }
  }, []);

  const fetchStaffList = useCallback(async () => {
    setAdminLoading(true);
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  // Fetch prices & session on mount
  useEffect(() => {
    fetchPrices();
    const cachedUser = localStorage.getItem('kayak_auth_user');
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch {
        localStorage.removeItem('kayak_auth_user');
      }
    }
  }, []);

  // Sync data depending on logged-in role
  useEffect(() => {
    if (user) {
      fetchBookings();
      fetchStaffList();
    }
  }, [user, fetchBookings, fetchStaffList]);

  // Combine staff names for selectors
  const staffNamesList = staffList.length > 0 
    ? staffList.map(s => s.username) 
    : ['Anoop', 'Benney', 'Gracious'];

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim()) {
      showToast('error', 'Please fill in both fields');
      return;
    }

    setAuthLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        const authenticatedUser = data.user;
        setUser(authenticatedUser);
        localStorage.setItem('kayak_auth_user', JSON.stringify(authenticatedUser));
        showToast('success', `Welcome back, ${authenticatedUser.username}!`);
        setUsernameInput('');
        setPasswordInput('');
      } else {
        showToast('error', data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to connect to authentication server');
    } finally {
      setAuthLoading(false);
    }
  };

  // Seed DB Helper
  const handleSeedDatabase = async () => {
    setAuthLoading(true);
    try {
      const response = await fetch('/api/auth/seed');
      const data = await response.json();
      if (response.ok && data.success) {
        setSeedStatus('Default staff seeded: Anoop (anoop123), Benney (benney123), Gracious (gracious123).');
        showToast('success', 'Seeding complete! You can now log in.');
        fetchStaffList();
      } else {
        setSeedStatus(data.message || 'Seeding failed or database already populated.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Seeding route connection error.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('kayak_auth_user');
    showToast('success', 'Logged out successfully');
  };

  // Admin: Save customized prices
  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    try {
      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          services: priceFormServices,
          addons: priceFormAddons,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || 'Prices customized successfully!');
        fetchPrices();
      } else {
        showToast('error', data.error || 'Failed to update prices');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error connecting to prices API');
    } finally {
      setAdminLoading(false);
    }
  };

  // Admin: Create Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffUser.trim() || !newStaffPassword.trim()) {
      showToast('error', 'Provide username and password');
      return;
    }

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newStaffUser, password: newStaffPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        showToast('success', data.message || 'Staff created!');
        setNewStaffUser('');
        setNewStaffPassword('');
        fetchStaffList();
      } else {
        showToast('error', data.error || 'Failed to create staff member');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error creating staff member');
    }
  };

  // Admin: Delete Staff
  const handleDeleteStaff = async (usernameToDelete: string) => {
    if (!confirm(`Are you sure you want to delete staff account: "${usernameToDelete}"?`)) return;

    try {
      const response = await fetch(`/api/staff?username=${encodeURIComponent(usernameToDelete)}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok) {
        showToast('success', data.message || 'Staff member removed');
        fetchStaffList();
      } else {
        showToast('error', data.error || 'Failed to delete staff member');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error deleting staff');
    }
  };

  // Excel Exporter
  const handleExportToExcel = () => {
    if (bookings.length === 0) {
      showToast('error', 'No bookings available to export');
      return;
    }

    // Format registry details for Excel sheet
    const dataToExport = bookings.map((b) => ({
      'Logged By (Staff)': b.entryUser,
      'Date': new Date(b.createdAt).toLocaleDateString(),
      'Time': new Date(b.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      'Guest Name': b.name,
      'Mobile Number': b.mob,
      'Pax Count': b.pax,
      'Partner Channel': b.partner,
      'Services selected': b.services.join(', '),
      'Addons selected': b.addons.join(', '),
      'Rate (Base)': b.rate,
      'Discount Applied': b.discount || 0,
      'Advance Paid': b.advance,
      'Balance Due': b.balance,
      'Agent Commission': b.commission,
      'Total Paid': b.total,
      'Guide Roster': b.guideStaff,
      'Assist Roster': b.assistStaff,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Club Bookings");

    // Write file locally
    XLSX.writeFile(workbook, `Pokkalo_Club_Bookings_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('success', 'Excel report downloaded successfully!');
  };

  // Automatically update base rate when services change using dynamically loaded rates
  useEffect(() => {
    if (user?.role !== 'staff') return;
    let calculatedBase = 0;
    let hasCustom = false;
    
    selectedServices.forEach(srvId => {
      const servicePrice = prices.services[srvId] ?? 0;
      calculatedBase += servicePrice;
      if (srvId === 'custom-package') {
        hasCustom = true;
      }
    });

    const paxCount = parseInt(pax) || 1;
    const finalBase = hasCustom ? '' : (calculatedBase * paxCount).toString();
    
    if (!hasCustom) {
      setRate(finalBase);
    }
  }, [selectedServices, pax, user, prices]);

  // Financial Calculations
  const rateVal = parseFloat(rate) || 0;
  const advanceVal = parseFloat(advance) || 0;
  const commissionVal = parseFloat(commission) || 0;
  const discountVal = parseFloat(discount) || 0;

  // Addon rates calculations (pickup and drop, food are custom inputs; refreshment is dynamic config * pax)
  const pickupVal = selectedAddons.includes('pickup-drop') ? (parseFloat(customPickupPrice) || 0) : 0;
  const foodVal = selectedAddons.includes('food') ? (parseFloat(customFoodPrice) || 0) : 0;
  const refreshmentVal = selectedAddons.includes('refreshment') ? (prices.addons['refreshment'] ?? 150) * (parseInt(pax) || 1) : 0;

  const addonsTotal = pickupVal + foodVal + refreshmentVal;

  const totalVal = Math.max(0, rateVal + addonsTotal - discountVal);
  const balanceVal = Math.max(0, totalVal - advanceVal);

  // Revenue analytics for admin
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total || 0), 0);
  const totalCommission = bookings.reduce((sum, b) => sum + (b.commission || 0), 0);
  const totalAdvance = bookings.reduce((sum, b) => sum + (b.advance || 0), 0);
  const totalBalance = bookings.reduce((sum, b) => sum + (b.balance || 0), 0);

  // Show Toast Helper
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Toggle helpers
  const toggleService = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setName('');
    setMob('');
    setPax('1');
    setSelectedServices([]);
    setSelectedAddons([]);
    setCustomFoodPrice('');
    setCustomPickupPrice('');
    setGuideStaff('');
    setAssistStaff('');
    setRate('');
    setAdvance('');
    setDiscount('');
    setCommission('');
  };

  // Submit Booking Form
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('error', 'Please enter guest name');
      return;
    }

    if (!mob.trim()) {
      showToast('error', 'Please enter guest mobile number');
      return;
    }

    if (!guideStaff) {
      showToast('error', 'Please select a Guide Staff');
      return;
    }

    if (!assistStaff) {
      showToast('error', 'Please select an Assist Staff');
      return;
    }

    if (selectedServices.length === 0) {
      showToast('error', 'Please select at least one service category');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      entryUser: user?.username || 'System',
      partner,
      name,
      mob,
      pax: parseInt(pax) || 1,
      services: selectedServices.map(srvId => SERVICE_TYPES.find(s => s.id === srvId)?.name || srvId),
      addons: selectedAddons.map(addonId => ADDONS.find(a => a.id === addonId)?.name || addonId),
      rate: rateVal,
      advance: advanceVal,
      discount: discountVal,
      balance: balanceVal,
      commission: commissionVal,
      total: totalVal,
      guideStaff,
      assistStaff,
      customPickupPrice: selectedAddons.includes('pickup-drop') ? (parseFloat(customPickupPrice) || 0) : 0,
      customFoodPrice: selectedAddons.includes('food') ? (parseFloat(customFoodPrice) || 0) : 0,
    };

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        showToast('success', 'Booking submitted successfully!');
        resetForm();
        fetchBookings();
      } else {
        showToast('error', result.error || 'Failed to submit booking');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="w-full max-w-md mx-auto px-4 py-6 flex-1 flex flex-col gap-6 relative">
        
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-xl flex items-center gap-3 shadow-2xl transition-all duration-300 transform translate-y-0 ${
            toast.type === 'success' 
              ? 'bg-emerald-950/95 border border-emerald-500/30 text-emerald-200' 
              : 'bg-rose-950/95 border border-rose-500/30 text-rose-200'
          }`}>
            {toast.type === 'success' ? (
              <div className="bg-emerald-500 text-emerald-950 p-1 rounded-full"><Check size={16} /></div>
            ) : (
              <div className="bg-rose-500 text-rose-950 p-1 rounded-full"><AlertCircle size={16} /></div>
            )}
            <span className="text-xs font-semibold">{toast.message}</span>
          </div>
        )}

        {/* 1. NO USER: RENDER LOGIN SCREEN */}
        {!user ? (
          <div className="glass-panel p-6 rounded-3xl flex flex-col gap-5 my-auto">
            <div className="text-center flex flex-col gap-1.5 pb-4 border-b border-zinc-800">
              <div className="mx-auto bg-sky-500/10 p-3 rounded-full text-sky-400 mb-2 border border-sky-500/20">
                <Lock size={28} />
              </div>
              <h1 className="text-2xl font-black text-white">Kayaking Portal</h1>
              <p className="text-xs text-zinc-400">Enter credentials to access booking admin panel</p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-username" className="text-xs text-zinc-400 font-medium">Username</label>
                <input
                  id="login-username"
                  type="text"
                  placeholder="admin or Staff Username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-3 px-4 text-sm text-white placeholder-zinc-650 focus:outline-none focus:border-sky-500 transition-colors"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-password" className="text-xs text-zinc-400 font-medium">Password</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-3 px-4 text-sm text-white placeholder-zinc-650 focus:outline-none focus:border-sky-500 transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-md cursor-pointer"
              >
                {authLoading ? <Loader2 size={16} className="animate-spin" /> : <span>Sign In</span>}
              </button>
            </form>

            {/* Database Setup Helper for Testing */}
            <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col gap-2.5">
              <div className="text-[10px] text-zinc-500 text-center leading-relaxed">
                If logging in for the first time, click below to populate the default staff credentials.
              </div>
              <button
                type="button"
                onClick={handleSeedDatabase}
                disabled={authLoading}
                className="py-2 px-3 border border-zinc-800 text-[10px] rounded-lg text-zinc-400 hover:bg-zinc-900/60 font-semibold transition-all cursor-pointer"
              >
                Seed Default Staff Accounts
              </button>
              {seedStatus && (
                <div className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-lg text-[10px] text-emerald-400 break-words leading-normal text-center">
                  {seedStatus}
                </div>
              )}
            </div>
          </div>
        ) : user.role === 'staff' ? (
          
          /* 2. RENDER STAFF BOOKING ENTRY FORM */
          <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="glass-panel p-4 rounded-2xl flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Kayak Booking Entry</span>
                <h1 className="text-lg font-bold text-white flex items-center gap-1.5">
                  Logged In: <span className="text-zinc-200">{user.username}</span>
                </h1>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-[10px] font-semibold text-zinc-400 py-1.5 px-2.5 rounded-lg transition-all cursor-pointer"
              >
                <LogOut size={12} />
                <span>Log Out</span>
              </button>
            </div>

            {/* Booking Entry Form */}
            <form onSubmit={handleSubmitBooking} className="flex flex-col gap-5">
              
              {/* Section 1: Guest Details */}
              <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                  <Users size={18} className="text-sky-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">1. Guest Details</h2>
                </div>

                {/* Partner Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-medium">Partner Type</label>
                  <div className="grid grid-cols-3 gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-850">
                    {PARTNER_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPartner(type)}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                          partner === type 
                            ? 'bg-sky-500 text-zinc-950 shadow-md shadow-sky-500/10' 
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Guest Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="staff-name" className="text-xs text-zinc-400 font-medium">Guest Name</label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      id="staff-name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Tel & Guest count row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="staff-mob" className="text-xs text-zinc-400 font-medium">Guest Mob</label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        id="staff-mob"
                        type="tel"
                        placeholder="9876543210"
                        value={mob}
                        onChange={(e) => setMob(e.target.value.replace(/[^0-9+]/g, ''))}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="staff-pax" className="text-xs text-zinc-400 font-medium">Pax (Guests)</label>
                    <input
                      id="staff-pax"
                      type="number"
                      min="1"
                      value={pax}
                      onChange={(e) => setPax(Math.max(1, parseInt(e.target.value) || 1).toString())}
                      className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Services */}
              <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                  <Layers size={18} className="text-sky-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">2. Services Selection</h2>
                </div>

                {/* Service list multi-select tags */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-zinc-400 font-medium">Select Services</label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_TYPES.map((service) => {
                      const isSelected = selectedServices.includes(service.id);
                      const servicePrice = prices.services[service.id] ?? 0;
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleService(service.id)}
                          className={`py-1.5 px-2.5 rounded-lg text-[11px] font-semibold border transition-all ${
                            isSelected
                              ? 'bg-sky-500/10 border-sky-500 text-sky-300'
                              : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          {service.name}
                          {servicePrice > 0 && <span className="opacity-60 ml-1">(₹{servicePrice})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Addons Grid */}
                <div className="flex flex-col gap-2 pt-2">
                  <label className="text-xs text-zinc-400 font-medium">Extra Add-ons</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ADDONS.map((addon) => {
                      const isSelected = selectedAddons.includes(addon.id);
                      const IconComponent = addon.icon;
                      
                      // Refreshment is dynamically configured; Food & Pickup-drop are custom rated
                      const displayPrice = addon.id === 'refreshment' 
                        ? `₹${prices.addons['refreshment'] ?? 150}`
                        : 'Custom';
                      
                      return (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() => toggleAddon(addon.id)}
                          className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                            isSelected
                              ? 'bg-sky-500/10 border-sky-500 text-sky-300'
                              : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:border-zinc-750'
                          }`}
                        >
                          <IconComponent size={15} />
                          <span className="text-[9px] font-bold leading-tight">{addon.name}</span>
                          <span className="text-[8px] opacity-60">+{displayPrice}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* CUSTOM ADDON PRICING INPUTS (Food and Pickup/Drop) */}
                  {selectedAddons.includes('pickup-drop') && (
                    <div className="flex flex-col gap-1.5 mt-2 animate-in slide-in-from-top-1 duration-150">
                      <label htmlFor="staff-pickup-price" className="text-[10px] text-zinc-400 font-medium">Pickup/Drop Total Price (₹)</label>
                      <input
                        id="staff-pickup-price"
                        type="number"
                        placeholder="Enter custom cost"
                        value={customPickupPrice}
                        onChange={(e) => setCustomPickupPrice(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500"
                        required
                      />
                    </div>
                  )}
                  {selectedAddons.includes('food') && (
                    <div className="flex flex-col gap-1.5 mt-2 animate-in slide-in-from-top-1 duration-150">
                      <label htmlFor="staff-food-price" className="text-[10px] text-zinc-400 font-medium">Food Total Price (₹)</label>
                      <input
                        id="staff-food-price"
                        type="number"
                        placeholder="Enter custom cost"
                        value={customFoodPrice}
                        onChange={(e) => setCustomFoodPrice(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2.5: Staff Assignment for Guide and Assist */}
              <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                  <Briefcase size={18} className="text-sky-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Staff Assigned</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="staff-guide-input" className="text-xs text-zinc-400 font-medium">Guide Staff</label>
                    <input
                      list="staff-list-options"
                      id="staff-guide-input"
                      value={guideStaff}
                      onChange={(e) => setGuideStaff(e.target.value)}
                      placeholder="Type or select Guide"
                      className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="staff-assist-input" className="text-xs text-zinc-400 font-medium">Assist Staff</label>
                    <input
                      list="staff-list-options"
                      id="staff-assist-input"
                      value={assistStaff}
                      onChange={(e) => setAssistStaff(e.target.value)}
                      placeholder="Type or select Assist"
                      className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>
                </div>

                {/* Shared Autocomplete Datalist */}
                <datalist id="staff-list-options">
                  {staffNamesList.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              {/* Section 3: Payment Details */}
              <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                  <DollarSign size={18} className="text-sky-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">3. Payment Details</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="staff-rate" className="text-xs text-zinc-400 font-medium">Rate (Base)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">₹</span>
                      <input
                        id="staff-rate"
                        type="number"
                        placeholder="0"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="staff-advance" className="text-xs text-zinc-400 font-medium">Advance Paid</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">₹</span>
                      <input
                        id="staff-advance"
                        type="number"
                        placeholder="0"
                        value={advance}
                        onChange={(e) => setAdvance(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400 font-medium">Balance Due</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">₹</span>
                      <input
                        type="text"
                        readOnly
                        value={balanceVal}
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-xl py-2 pl-7 pr-3 text-xs text-amber-400 font-bold cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="staff-commission" className="text-xs text-zinc-400 font-medium">Commission</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">₹</span>
                      <input
                        id="staff-commission"
                        type="number"
                        placeholder="0"
                        value={commission}
                        onChange={(e) => setCommission(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="staff-discount" className="text-xs text-zinc-400 font-medium">Discount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">₹</span>
                      <input
                        id="staff-discount"
                        type="number"
                        placeholder="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Banner */}
                <div className="bg-sky-500/10 border border-sky-500/25 rounded-xl p-3 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-sky-400 font-bold uppercase">Total Bill</span>
                    <span className="text-[8px] text-zinc-500">Rate + Addons - Discount</span>
                  </div>
                  <div className="text-lg font-black text-white">
                    ₹{totalVal}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold py-3.5 rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Saving entry...</span>
                  </>
                ) : (
                  <span>Submit Booking</span>
                )}
              </button>

            </form>

            {/* Local logs */}
            <div className="glass-panel p-4 rounded-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">My Recent Logs</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExportToExcel}
                    className="text-[9px] text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded border border-zinc-800"
                  >
                    <Download size={10} />
                    <span>Export</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={fetchBookings} 
                    className="text-[9px] text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              {isLoadingBookings ? (
                <div className="py-4 text-center text-zinc-500 text-[10px] flex items-center justify-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Loading log history...</span>
                </div>
              ) : bookings.filter(b => b.entryUser === user.username).length === 0 ? (
                <div className="py-4 text-center text-zinc-500 text-[10px]">
                  No bookings saved by you today.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                  {bookings
                    .filter(b => b.entryUser === user.username)
                    .map((booking) => (
                      <div 
                        key={booking._id} 
                        onClick={() => setSelectedBookingForDetails(booking)}
                        className="bg-zinc-950/40 border border-zinc-900 rounded-lg p-2 flex flex-col gap-0.5 cursor-pointer hover:border-sky-500/30 transition-colors"
                      >
                        <div className="flex justify-between text-[10px] font-bold text-zinc-300">
                          <span>{booking.name} - {booking.mob} ({booking.pax} Pax)</span>
                          <span className="text-sky-400">₹{booking.total}</span>
                        </div>
                        <div className="text-[8px] text-zinc-500">
                          Services: {booking.services.join(', ')}
                        </div>
                        <div className="flex justify-between text-[7px] text-zinc-600 mt-1">
                          <span>Staff: Guide: {booking.guideStaff} | Assist: {booking.assistStaff}</span>
                          <span>{booking.partner}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

        ) : (

          /* 3. RENDER CENTRAL ADMIN DASHBOARD */
          <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="glass-panel p-4 rounded-2xl flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Central Controller</span>
                <h1 className="text-base font-black text-white">Admin Console</h1>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-400 py-1.5 px-3 rounded-lg transition-all cursor-pointer"
              >
                <LogOut size={12} />
                <span>Log Out</span>
              </button>
            </div>

            {/* Quick Analytics Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-panel p-3.5 rounded-xl flex flex-col gap-1">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Gross Sales</span>
                <span className="text-lg font-black text-emerald-400">₹{totalRevenue}</span>
                <span className="text-[7px] text-zinc-400">{bookings.length} Bookings total</span>
              </div>

              <div className="glass-panel p-3.5 rounded-xl flex flex-col gap-1">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Commissions</span>
                <span className="text-lg font-black text-amber-400">₹{totalCommission}</span>
                <span className="text-[7px] text-zinc-400">Due to agent/brokers</span>
              </div>

              <div className="glass-panel p-3.5 rounded-xl flex flex-col gap-1">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Advances Received</span>
                <span className="text-lg font-black text-sky-400">₹{totalAdvance}</span>
                <span className="text-[7px] text-zinc-400">Balance due: ₹{totalBalance}</span>
              </div>

              <div className="glass-panel p-3.5 rounded-xl flex flex-col gap-1">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Staff Members</span>
                <span className="text-lg font-black text-purple-400">{staffList.length}</span>
                <span className="text-[7px] text-zinc-400">Active dock staff</span>
              </div>
            </div>

            {/* Dynamic Price Customization Section (Food & Pickup are custom; not configurable here) */}
            <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <DollarSign size={16} className="text-amber-500" />
                <span>Customize Prices</span>
              </h3>
              
              <form onSubmit={handleSavePrices} className="flex flex-col gap-3">
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Services Base Rates (₹)</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {SERVICE_TYPES.map((srv) => (
                    <div key={srv.id} className="flex flex-col gap-1">
                      <label className="text-[9px] text-zinc-400 truncate">{srv.name}</label>
                      <input
                        type="number"
                        value={priceFormServices[srv.id] ?? ''}
                        onChange={(e) => setPriceFormServices({
                          ...priceFormServices,
                          [srv.id]: parseInt(e.target.value) || 0
                        })}
                        className="bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  ))}
                </div>

                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2">Add-ons Rates (₹)</div>
                <div className="grid grid-cols-3 gap-2">
                  {ADDONS.filter(addon => addon.id === 'refreshment').map((addon) => (
                    <div key={addon.id} className="flex flex-col gap-1">
                      <label className="text-[9px] text-zinc-400 truncate">{addon.name}</label>
                      <input
                        type="number"
                        value={priceFormAddons[addon.id] ?? ''}
                        onChange={(e) => setPriceFormAddons({
                          ...priceFormAddons,
                          [addon.id]: parseInt(e.target.value) || 0
                        })}
                        className="bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-[8px] text-zinc-500 leading-normal bg-zinc-900/40 p-2 rounded-lg border border-zinc-850 mt-1">
                  💡 Note: Pickup/Drop and Food add-ons are set dynamically on the staff entry form as custom prices.
                </div>

                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold py-2 rounded-lg text-xs mt-2 transition-colors cursor-pointer"
                >
                  {adminLoading ? 'Saving...' : 'Save Customizable Prices'}
                </button>
              </form>
            </div>

            {/* Staff Accounts Management */}
            <div className="glass-panel p-4 rounded-2xl flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1">
                <Briefcase size={14} className="text-sky-400" />
                <span>Manage Staff Accounts</span>
              </h3>

              {/* Create Staff Form */}
              <form onSubmit={handleCreateStaff} className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 flex flex-col gap-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Username"
                    value={newStaffUser}
                    onChange={(e) => setNewStaffUser(e.target.value)}
                    className="bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-sky-500"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    className="bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Create Staff Account</span>
                </button>
              </form>

              {/* Staff list */}
              {adminLoading ? (
                <div className="py-2 text-center text-zinc-600 text-[10px] flex items-center justify-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Loading staff database...</span>
                </div>
              ) : staffList.length === 0 ? (
                <div className="text-center py-2 text-[10px] text-zinc-650">No staff members configured. Use form above to add.</div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                  {staffList.map((member) => (
                    <div key={member._id} className="bg-zinc-900/60 rounded-lg py-1.5 px-2.5 flex justify-between items-center text-xs border border-zinc-850/60">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-zinc-400" />
                        <span className="font-semibold text-zinc-200">{member.username}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(member.username)}
                        className="text-rose-500 hover:text-rose-400 p-1 rounded-md transition-colors"
                        title="Delete account"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bookings log table (Admin view) */}
            <div className="glass-panel p-4 rounded-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1">
                  <TrendingUp size={14} className="text-emerald-400" />
                  <span>Club Booking Registry</span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExportToExcel}
                    className="text-[9px] text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded border border-zinc-800"
                  >
                    <Download size={10} />
                    <span>Export Logs</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={fetchBookings} 
                    className="text-[9px] text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    Sync Logs
                  </button>
                </div>
              </div>

              {isLoadingBookings ? (
                <div className="py-6 text-center text-zinc-500 text-xs flex items-center justify-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Syncing cloud databases...</span>
                </div>
              ) : bookings.length === 0 ? (
                <div className="py-6 text-center text-zinc-550 text-xs">No entries submitted.</div>
              ) : (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                  {bookings.map((booking) => (
                    <div 
                      key={booking._id} 
                      onClick={() => setSelectedBookingForDetails(booking)}
                      className="bg-zinc-950 border border-zinc-900 rounded-lg p-2.5 flex flex-col gap-1 text-[10px] cursor-pointer hover:border-sky-500/30 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-zinc-200">{booking.name} - {booking.mob} ({booking.pax} Guests)</span>
                        <span className="font-black text-emerald-400">₹{booking.total}</span>
                      </div>
                      <div className="text-[9px] text-zinc-400 leading-tight">
                        <strong>Services:</strong> {booking.services.join(', ')}
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 text-[8px] text-zinc-500 border-t border-zinc-900/60 pt-1 mt-1">
                        <span>Log creator: <strong className="text-zinc-400">{booking.entryUser}</strong></span>
                        <span className="text-right">Advance: ₹{booking.advance} | Bal: ₹{booking.balance}</span>
                        <span>Staff: G: {booking.guideStaff} | A: {booking.assistStaff}</span>
                        <span className="text-right">{new Date(booking.createdAt).toLocaleDateString()} {new Date(booking.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Detailed Log Entry View */}
        {selectedBookingForDetails && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-sm rounded-3xl p-5 flex flex-col gap-4 relative animate-in fade-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="flex justify-between items-start pb-3 border-b border-zinc-800">
                <div className="flex flex-col">
                  <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Booking Receipt Details</span>
                  <h3 className="text-sm font-bold text-white truncate max-w-[200px]">
                    {selectedBookingForDetails.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedBookingForDetails(null)}
                  className="text-xs text-zinc-500 hover:text-white font-semibold py-1 px-2 bg-zinc-900 border border-zinc-850 rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Content Details */}
              <div className="flex flex-col gap-3 text-xs text-zinc-300 overflow-y-auto max-h-[350px] pr-1">
                
                {/* Logging Audit Info */}
                <div className="bg-zinc-950 border border-zinc-900 p-2.5 rounded-xl flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-[10px] font-medium">Logged By</span>
                    <span className="text-zinc-200 font-semibold">{selectedBookingForDetails.entryUser}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-[10px] font-medium">Log Date</span>
                    <span className="text-zinc-400 text-[10px]">{new Date(selectedBookingForDetails.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Guest Details */}
                <div className="flex flex-col gap-1 pt-1">
                  <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">Guest & Partner</div>
                  <div className="grid grid-cols-2 gap-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850/60">
                    <div>
                      <div className="text-[9px] text-zinc-500">Guest Mobile</div>
                      <div className="font-semibold text-white">{selectedBookingForDetails.mob}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500">Group Size (Pax)</div>
                      <div className="font-semibold text-white">{selectedBookingForDetails.pax} Guests</div>
                    </div>
                    <div className="col-span-2 border-t border-zinc-850 pt-1.5 mt-1">
                      <div className="text-[9px] text-zinc-500">Partner Channel</div>
                      <div className="font-semibold text-white">{selectedBookingForDetails.partner}</div>
                    </div>
                  </div>
                </div>

                {/* Staff Assignments */}
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">Staff Roster</div>
                  <div className="grid grid-cols-2 gap-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850/60">
                    <div>
                      <div className="text-[9px] text-zinc-500">Guide Assigned</div>
                      <div className="font-semibold text-white">{selectedBookingForDetails.guideStaff}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500">Assist Assigned</div>
                      <div className="font-semibold text-white">{selectedBookingForDetails.assistStaff}</div>
                    </div>
                  </div>
                </div>

                {/* Selected Services & Addons */}
                <div className="flex flex-col gap-1.5">
                  <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">Services Logs</div>
                  <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850/60 flex flex-col gap-1">
                    <div>
                      <span className="text-zinc-500 text-[10px]">Activities:</span>
                      <p className="font-semibold text-zinc-200">{selectedBookingForDetails.services.join(', ')}</p>
                    </div>
                    {selectedBookingForDetails.addons && selectedBookingForDetails.addons.length > 0 && (
                      <div className="border-t border-zinc-850 pt-1.5 mt-1">
                        <span className="text-zinc-500 text-[10px]">Add-ons:</span>
                        <p className="font-semibold text-zinc-200">{selectedBookingForDetails.addons.join(', ')}</p>
                        {selectedBookingForDetails.customPickupPrice !== undefined && selectedBookingForDetails.customPickupPrice > 0 && (
                          <span className="text-[9px] text-zinc-400 block">&bull; Pickup cost: ₹{selectedBookingForDetails.customPickupPrice}</span>
                        )}
                        {selectedBookingForDetails.customFoodPrice !== undefined && selectedBookingForDetails.customFoodPrice > 0 && (
                          <span className="text-[9px] text-zinc-400 block">&bull; Food cost: ₹{selectedBookingForDetails.customFoodPrice}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing breakdown */}
                <div className="flex flex-col gap-1.5">
                  <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">Financial Calculations</div>
                  <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850/60 flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Base Price (Rate)</span>
                      <span className="text-white font-medium">₹{selectedBookingForDetails.rate}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Upfront Advance</span>
                      <span className="text-white font-medium">- ₹{selectedBookingForDetails.advance}</span>
                    </div>
                    {selectedBookingForDetails.discount > 0 && (
                      <div className="flex justify-between text-zinc-400">
                        <span>Discount Given</span>
                        <span className="text-emerald-400 font-medium">- ₹{selectedBookingForDetails.discount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-amber-500 font-semibold border-t border-zinc-850 pt-1 mt-0.5">
                      <span>Balance Due</span>
                      <span>₹{selectedBookingForDetails.balance}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400 border-t border-zinc-850 pt-1.5 mt-1">
                      <span>Agent Commission</span>
                      <span className="text-white font-medium">₹{selectedBookingForDetails.commission}</span>
                    </div>
                    <div className="flex justify-between text-sky-400 font-bold border-t border-zinc-850 pt-1 mt-0.5">
                      <span>Total Bill (incl. Addons)</span>
                      <span>₹{selectedBookingForDetails.total}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Dynamic attribution footer */}
        <footer className="mt-auto pt-8 pb-4 text-center">
          <p className="text-[9px] text-zinc-600 opacity-40 hover:opacity-100 transition-opacity font-semibold">
            Pokkalo Club &copy; {new Date().getFullYear()} &bull; Made by Alvin Ben George
          </p>
        </footer>

      </main>
    </div>
  );
}
