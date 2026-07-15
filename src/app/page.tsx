'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Download,
  Link,
  Tag,
  MessageSquare,
  Edit2,
  Save,
  X,
  FileText,
  Image as ImageIcon
} from 'lucide-react';

const PARTNER_TYPES = ['Walk-In', 'Partner', 'Broker'] as const;
type PartnerType = typeof PARTNER_TYPES[number];

const ADDONS = [
  { id: 'pickup-drop', name: 'Pickup and drop', icon: MapPin },
  { id: 'food', name: 'Food', icon: Utensils },
  { id: 'refreshment', name: 'Refreshment', icon: Coffee },
] as const;

interface ServiceRow {
  serviceId: string;
  serviceName: string;
  adults: number;
  children: number;
  rate: number;
}

interface BookingRecord {
  _id: string;
  registerNumber: string;
  entryUser: string;
  partner: string;
  partnerName?: string;
  name: string;
  mob: string;
  adults: number;
  children: number;
  services: ServiceRow[];
  addons: string[];
  rate: number;
  advance: number;
  discount: number;
  extraCharges?: number;
  balance: number;
  commission: number;
  total: number;
  guideStaff: string[];
  assistStaff: string[];
  driverStaff?: string;
  advanceAccount?: string;
  balanceAccount?: string;
  customPickupPrice?: number;
  customFoodPrice?: number;
  customRefreshmentPrice?: number;
  guestRemarks?: string;
  serviceRemarks?: string;
  staffRemarks?: string;
  location: string;
  createdAt: string;
}

interface ExpenseRecord {
  _id: string;
  date: string;
  type: string;
  amount: number;
  paymentMode: 'Cash' | 'Gpay';
  screenshot?: string; // Base64 compressed screenshot string
  remarks?: string;
  entryUser: string;
  createdAt: string;
}

interface StaffUser {
  _id: string;
  username: string;
  role: string;
  createdAt: string;
}

interface LocationBranch {
  _id: string;
  name: string;
  createdAt: string;
}

interface ServicePricingConfig {
  id: string;
  name: string;
  price: number;
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

  // Tab View Switcher ('guest' | 'expenses')
  const [activeTab, setActiveTab] = useState<'guest' | 'expenses'>('guest');

  // Dynamic Prices State
  const [prices, setPrices] = useState<{
    services: ServicePricingConfig[];
    addons: Record<string, number>;
  }>({
    services: [
      { id: 'sunrise-kayaking', name: 'Sunrise Kayaking', price: 1200 },
      { id: 'sunset-kayaking', name: 'Sun Set Kayaking', price: 1500 },
      { id: 'towing', name: 'Towing', price: 800 },
      { id: 'boating', name: 'Boating', price: 2000 },
      { id: 'fishing', name: 'Fishing', price: 2500 },
      { id: 'bioluminescence-boating', name: 'Bioluminescence Boating', price: 1800 },
      { id: 'bioluminescence-kayaking', name: 'Bioluminescence Kayaking', price: 2200 }
    ],
    addons: {}
  });

  // Locations / Branches State
  const [locationsList, setLocationsList] = useState<LocationBranch[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [newLocationName, setNewLocationName] = useState('');

  // Staff Assignment State (Tag arrays)
  const [guideStaff, setGuideStaff] = useState<string[]>([]);
  const [assistStaff, setAssistStaff] = useState<string[]>([]);
  const [driverStaff, setDriverStaff] = useState('');

  // Form Fields State (Staff view - New Guest tab)
  const [partner, setPartner] = useState<PartnerType>('Walk-In');
  const [partnerName, setPartnerName] = useState('');
  const [name, setName] = useState('');
  const [mob, setMob] = useState('');
  
  // Guest adults / children count
  const [guestAdults, setGuestAdults] = useState<number>(1);
  const [guestChildren, setGuestChildren] = useState<number>(0);

  // Dynamic Service rows lists
  const [serviceRows, setServiceRows] = useState<Array<{
    serviceId: string;
    adults: number;
    children: number;
  }>>([]);

  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [rate, setRate] = useState<string>('');
  const [advance, setAdvance] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [extraCharges, setExtraCharges] = useState<string>('');
  const [commission, setCommission] = useState<string>('');

  // Accounts for payments
  const [advanceAccount, setAdvanceAccount] = useState('');
  const [balanceAccount, setBalanceAccount] = useState('');

  // Custom Pricing Fields for addons
  const [customPickupPrice, setCustomPickupPrice] = useState<string>('');
  const [customFoodPrice, setCustomFoodPrice] = useState<string>('');
  const [customRefreshmentPrice, setCustomRefreshmentPrice] = useState<string>('');

  // Remarks per section
  const [guestRemarks, setGuestRemarks] = useState('');
  const [serviceRemarks, setServiceRemarks] = useState('');
  const [staffRemarks, setStaffRemarks] = useState('');

  // EXPENSE ENTRY FORM STATES
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expenseType, setExpenseType] = useState('Fuel');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseMode, setExpenseMode] = useState<'Cash' | 'Gpay'>('Cash');
  const [expenseScreenshot, setExpenseScreenshot] = useState('');
  const [expenseRemarks, setExpenseRemarks] = useState('');
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview modals
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);

  // Admin Dashboard State
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [newStaffUser, setNewStaffUser] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Admin Customizable Prices Form State
  const [priceFormServices, setPriceFormServices] = useState<ServicePricingConfig[]>([]);

  // General App State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  
  // Modal detail log entry view states
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<BookingRecord | null>(null);
  const [isAdminEditing, setIsAdminEditing] = useState(false);

  // Admin Modal Edit form values
  const [editRegisterNumber, setEditRegisterNumber] = useState('');
  const [editPartner, setEditPartner] = useState<PartnerType>('Walk-In');
  const [editPartnerName, setEditPartnerName] = useState('');
  const [editName, setEditName] = useState('');
  const [editMob, setEditMob] = useState('');
  const [editAdults, setEditAdults] = useState<number>(1);
  const [editChildren, setEditChildren] = useState<number>(0);
  const [editServiceRows, setEditServiceRows] = useState<Array<{
    serviceId: string;
    adults: number;
    children: number;
  }>>([]);
  const [editSelectedAddons, setEditSelectedAddons] = useState<string[]>([]);
  const [editCustomPickupPrice, setEditCustomPickupPrice] = useState<string>('');
  const [editCustomFoodPrice, setEditCustomFoodPrice] = useState<string>('');
  const [editCustomRefreshmentPrice, setEditCustomRefreshmentPrice] = useState<string>('');
  const [editGuideStaff, setEditGuideStaff] = useState<string[]>([]);
  const [editAssistStaff, setEditAssistStaff] = useState<string[]>([]);
  const [editDriverStaff, setEditDriverStaff] = useState('');
  const [editRate, setEditRate] = useState<string>('');
  const [editAdvance, setEditAdvance] = useState<string>('');
  const [editExtraCharges, setEditExtraCharges] = useState<string>('');
  const [editDiscount, setEditDiscount] = useState<string>('');
  const [editCommission, setEditCommission] = useState<string>('');
  const [editAdvanceAccount, setEditAdvanceAccount] = useState('');
  const [editBalanceAccount, setEditBalanceAccount] = useState('');
  const [editGuestRemarks, setEditGuestRemarks] = useState('');
  const [editServiceRemarks, setEditServiceRemarks] = useState('');
  const [editStaffRemarks, setEditStaffRemarks] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Load customizable prices from API
  const fetchPrices = async () => {
    try {
      const res = await fetch('/api/prices');
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
        setPriceFormServices(data.services || []);
        
        // Initialize default service row on staff side if none exists
        if (data.services && data.services.length > 0 && serviceRows.length === 0) {
          setServiceRows([{ serviceId: data.services[0].id, adults: 1, children: 0 }]);
        }
      }
    } catch (err) {
      console.error('Failed to load prices:', err);
    }
  };

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch('/api/locations');
      if (res.ok) {
        const data = await res.json();
        setLocationsList(data);
        if (data.length > 0 && !selectedLocation) {
          setSelectedLocation(data[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  }, [selectedLocation]);

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

  const fetchExpenses = useCallback(async () => {
    setIsLoadingExpenses(true);
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setIsLoadingExpenses(false);
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
    fetchLocations();
    const cachedUser = localStorage.getItem('kayak_auth_user');
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch {
        localStorage.removeItem('kayak_auth_user');
      }
    }
  }, [fetchLocations]);

  // Sync data depending on logged-in role
  useEffect(() => {
    if (user) {
      fetchBookings();
      fetchExpenses();
      fetchStaffList();
      fetchLocations();
    }
  }, [user, fetchBookings, fetchExpenses, fetchStaffList, fetchLocations]);

  // Force commission to 0 and disable it when Walk-In is selected
  useEffect(() => {
    if (partner === 'Walk-In') {
      setCommission('0');
    }
  }, [partner]);

  // Sync service rows only when prices update
  useEffect(() => {
    if (prices.services.length > 0) {
      setServiceRows(prev => {
        if (prev.length === 0) {
          return [{ serviceId: prices.services[0].id, adults: 1, children: 0 }];
        }
        return prev.map(row => {
          const exists = prices.services.some(s => s.id === row.serviceId);
          if (!exists) {
            return { ...row, serviceId: prices.services[0].id };
          }
          return row;
        });
      });
    }
  }, [prices]);

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

  // Admin Custom Services Modifiers
  const handleAdminServiceChange = (index: number, key: 'name' | 'price', val: any) => {
    const updated = [...priceFormServices];
    updated[index] = {
      ...updated[index],
      [key]: val
    };
    setPriceFormServices(updated);
  };

  const handleAdminDeleteService = (index: number) => {
    setPriceFormServices(priceFormServices.filter((_, idx) => idx !== index));
  };

  const handleAdminAddService = () => {
    setPriceFormServices([
      ...priceFormServices,
      { id: 'custom-' + Date.now(), name: '', price: 0 }
    ]);
  };

  // Admin: Save customized prices
  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if any service names are empty
    const hasEmpty = priceFormServices.some(s => !s.name.trim());
    if (hasEmpty) {
      showToast('error', 'All service names must be filled out');
      return;
    }

    setAdminLoading(true);
    try {
      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          services: priceFormServices,
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

  // Admin: Create Location
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) {
      showToast('error', 'Location name is required');
      return;
    }

    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLocationName.trim() }),
      });
      const data = await response.json();

      if (response.ok) {
        showToast('success', data.message || 'Location branch added!');
        setNewLocationName('');
        fetchLocations();
      } else {
        showToast('error', data.error || 'Failed to create location');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error creating location');
    }
  };

  // Admin: Delete Location
  const handleDeleteLocation = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete location branch: "${name}"?`)) return;

    try {
      const response = await fetch(`/api/locations?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok) {
        showToast('success', data.message || 'Location branch deleted');
        fetchLocations();
      } else {
        showToast('error', data.error || 'Failed to delete location');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error deleting location');
    }
  };

  // Admin: Delete Booking Log
  const handleDeleteBooking = async (id: string, guestName: string) => {
    if (!confirm(`Are you sure you want to permanently delete the booking log for "${guestName}"?`)) return;

    try {
      const response = await fetch(`/api/bookings?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (response.ok) {
        showToast('success', data.message || 'Booking entry deleted successfully');
        fetchBookings();
      } else {
        showToast('error', data.error || 'Failed to delete booking entry');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error deleting booking registry log');
    }
  };

  // Excel Exporter (Restricted to Admin console only)
  const handleExportToExcel = () => {
    if (bookings.length === 0) {
      showToast('error', 'No bookings available to export');
      return;
    }

    const dataToExport = bookings.map((b) => ({
      'Register Number': b.registerNumber || 'N/A',
      'Logged By (Staff)': b.entryUser,
      'Date': new Date(b.createdAt).toLocaleDateString(),
      'Time': new Date(b.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      'Partner Channel': b.partner,
      'Partner/Broker Name': b.partnerName || 'N/A',
      'Guest Name': b.name,
      'Mobile Number': b.mob,
      'Guest Adults Count': b.adults,
      'Guest Children Count': b.children,
      'Branch Location': b.location || 'N/A',
      'Services Details Summary': b.services.map(s => `${s.serviceName} (A:${s.adults}, C:${s.children})`).join(' | '),
      'Addons selected': b.addons.join(', '),
      'Guides Assigned': Array.isArray(b.guideStaff) ? b.guideStaff.join(', ') : (b.guideStaff || 'N/A'),
      'Assistants Assigned': Array.isArray(b.assistStaff) ? b.assistStaff.join(', ') : (b.assistStaff || 'N/A'),
      'Driver Staff': b.driverStaff || 'N/A',
      'Rate (Base)': b.rate,
      'Advance Paid': b.advance,
      'Advance Account': b.advanceAccount || 'N/A',
      'Extra Charges (Isolated)': b.extraCharges || 0,
      'Discount Applied': b.discount || 0,
      'Balance Due': b.balance,
      'Balance Account': b.balanceAccount || 'N/A',
      'Agent Commission': b.commission,
      'Total Paid': b.total,
      'Guest Remarks': b.guestRemarks || '',
      'Service Remarks': b.serviceRemarks || '',
      'Staff Remarks': b.staffRemarks || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Club Bookings");

    XLSX.writeFile(workbook, `Pokkalo_Kayaking_Club_Bookings_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('success', 'Excel report downloaded successfully!');
  };

  // Dynamically calculate base rates from selected services list
  // Child has exactly 50% cost of the base service rate
  useEffect(() => {
    if (user?.role !== 'staff') return;
    
    let totalBaseCalculated = 0;
    serviceRows.forEach(row => {
      const match = prices.services.find(s => s.id === row.serviceId);
      const basePrice = match ? match.price : 0;
      const adultCost = basePrice * row.adults;
      const childCost = basePrice * row.children * 0.5;
      totalBaseCalculated += (adultCost + childCost);
    });

    setRate(totalBaseCalculated.toString());
  }, [serviceRows, user, prices]);

  // Reset conditional fields when channel switches
  useEffect(() => {
    if (partner === 'Walk-In') {
      setPartnerName('');
    }
  }, [partner]);

  // Dynamic Service Row Actions
  const handleAddServiceRow = () => {
    if (prices.services.length > 0) {
      setServiceRows([...serviceRows, { serviceId: prices.services[0].id, adults: 1, children: 0 }]);
    } else {
      showToast('error', 'No services available to select');
    }
  };

  const handleRemoveServiceRow = (index: number) => {
    setServiceRows(serviceRows.filter((_, idx) => idx !== index));
  };

  const handleServiceRowChange = (index: number, key: 'serviceId' | 'adults' | 'children', val: any) => {
    const updated = [...serviceRows];
    updated[index] = {
      ...updated[index],
      [key]: val
    };
    setServiceRows(updated);
  };

  // Check if Towing or Boating is selected in current services to show Driver inputs
  const showDriverOption = serviceRows.some(row => row.serviceId.includes('towing') || row.serviceId.includes('boating'));
  const isDriverCompulsory = serviceRows.some(row => row.serviceId.includes('towing'));

  // Financial Calculations
  const rateVal = parseFloat(rate) || 0;
  const advanceVal = parseFloat(advance) || 0;
  const discountVal = parseFloat(discount) || 0;

  // Addon rates calculations
  const pickupVal = selectedAddons.includes('pickup-drop') ? (parseFloat(customPickupPrice) || 0) : 0;
  const foodVal = selectedAddons.includes('food') ? (parseFloat(customFoodPrice) || 0) : 0;
  const refreshmentVal = selectedAddons.includes('refreshment') ? (parseFloat(customRefreshmentPrice) || 0) : 0;

  const addonsTotal = pickupVal + foodVal + refreshmentVal;

  const totalVal = Math.max(0, rateVal + addonsTotal - discountVal);
  const balanceVal = Math.max(0, totalVal - advanceVal);

  // Revenue analytics for admin
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total || 0), 0);
  const totalCommission = bookings.reduce((sum, b) => sum + (b.commission || 0), 0);
  const totalAdvance = bookings.reduce((sum, b) => sum + (b.advance || 0), 0);
  const totalBalance = bookings.reduce((sum, b) => sum + (b.balance || 0), 0);
  const totalExpenseSum = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Show Toast Helper
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Toggle helpers
  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  // Toggle Guide selection list helper
  const handleToggleGuide = (name: string) => {
    setGuideStaff(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  // Toggle Assist selection list helper
  const handleToggleAssist = (name: string) => {
    setAssistStaff(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const resetForm = () => {
    setName('');
    setMob('');
    setGuestAdults(1);
    setGuestChildren(0);
    setPartner('Walk-In');
    setPartnerName('');
    if (prices.services.length > 0) {
      setServiceRows([{ serviceId: prices.services[0].id, adults: 1, children: 0 }]);
    } else {
      setServiceRows([]);
    }
    setSelectedAddons([]);
    setCustomFoodPrice('');
    setCustomPickupPrice('');
    setCustomRefreshmentPrice('');
    setGuestRemarks('');
    setServiceRemarks('');
    setStaffRemarks('');
    setGuideStaff([]);
    setAssistStaff([]);
    setDriverStaff('');
    setRate('');
    setAdvance('');
    setAdvanceAccount('');
    setBalanceAccount('');
    setDiscount('');
    setExtraCharges('');
    setCommission('');
    if (locationsList.length > 0) {
      setSelectedLocation(locationsList[0].name);
    } else {
      setSelectedLocation('');
    }
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

    if (guestAdults < 1) {
      showToast('error', 'Guest Adults head count is compulsory (minimum 1)');
      return;
    }

    if (!selectedLocation) {
      showToast('error', 'Please select a branch location');
      return;
    }

    if ((partner === 'Partner' || partner === 'Broker') && !partnerName.trim()) {
      showToast('error', `Please provide the ${partner.toLowerCase()} name`);
      return;
    }

    if (guideStaff.length === 0) {
      showToast('error', 'Please select at least one Guide Staff');
      return;
    }

    if (isDriverCompulsory && !driverStaff) {
      showToast('error', 'Boat Driver Staff is compulsory for Towing');
      return;
    }

    if (advanceVal > 0 && !advanceAccount) {
      showToast('error', 'Advance Paid Account is compulsory when advance payment is made');
      return;
    }

    if (!balanceAccount) {
      showToast('error', 'Balance Paid Account is compulsory');
      return;
    }

    if (serviceRows.length === 0) {
      showToast('error', 'Please add at least one service');
      return;
    }

    setIsSubmitting(true);

    // Format selected services array
    const servicesPayload = serviceRows.map(row => {
      const originalService = prices.services.find(s => s.id === row.serviceId);
      const basePrice = originalService ? originalService.price : 0;
      const computedRowRate = (basePrice * row.adults) + (basePrice * row.children * 0.5);
      return {
        serviceId: row.serviceId,
        serviceName: originalService ? originalService.name : row.serviceId,
        adults: row.adults,
        children: row.children,
        rate: computedRowRate
      };
    });

    const payload = {
      entryUser: user?.username || 'System',
      partner,
      partnerName: (partner === 'Partner' || partner === 'Broker') ? partnerName : '',
      name,
      mob,
      adults: guestAdults,
      children: guestChildren,
      services: servicesPayload,
      addons: selectedAddons.map(addonId => ADDONS.find(a => a.id === addonId)?.name || addonId),
      rate: rateVal,
      advance: advanceVal,
      advanceAccount: advanceVal > 0 ? advanceAccount : '',
      balanceAccount,
      discount: discountVal,
      extraCharges: parseFloat(extraCharges) || 0,
      balance: balanceVal,
      commission: partner === 'Walk-In' ? 0 : (parseFloat(commission) || 0),
      total: totalVal,
      guideStaff, // Tag array of strings
      assistStaff, // Tag array of strings
      driverStaff: showDriverOption ? driverStaff : '',
      customPickupPrice: selectedAddons.includes('pickup-drop') ? (parseFloat(customPickupPrice) || 0) : 0,
      customFoodPrice: selectedAddons.includes('food') ? (parseFloat(customFoodPrice) || 0) : 0,
      customRefreshmentPrice: selectedAddons.includes('refreshment') ? (parseFloat(customRefreshmentPrice) || 0) : 0,
      guestRemarks,
      serviceRemarks,
      staffRemarks,
      location: selectedLocation,
    };

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        showToast('success', `Booking submitted! Assigned ${result.registerNumber}`);
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

  // Toggle Admin Edit Mode inside detailed popup
  const handleOpenDetailedModal = (booking: BookingRecord) => {
    setSelectedBookingForDetails(booking);
    setIsAdminEditing(false);

    // Populate admin edit states
    setEditRegisterNumber(booking.registerNumber || '');
    setEditPartner(booking.partner as PartnerType || 'Walk-In');
    setEditPartnerName(booking.partnerName || '');
    setEditName(booking.name || '');
    setEditMob(booking.mob || '');
    setEditAdults(booking.adults || 1);
    setEditChildren(booking.children || 0);
    setEditServiceRows(booking.services.map(s => ({
      serviceId: s.serviceId,
      adults: s.adults,
      children: s.children
    })));

    // Reconstruct addon selections
    const activeAddons: string[] = [];
    if (booking.addons.includes('Pickup and drop')) activeAddons.push('pickup-drop');
    if (booking.addons.includes('Food')) activeAddons.push('food');
    if (booking.addons.includes('Refreshment')) activeAddons.push('refreshment');
    setEditSelectedAddons(activeAddons);

    setEditCustomPickupPrice(booking.customPickupPrice?.toString() || '');
    setEditCustomFoodPrice(booking.customFoodPrice?.toString() || '');
    setEditCustomRefreshmentPrice(booking.customRefreshmentPrice?.toString() || '');

    setEditGuideStaff(Array.isArray(booking.guideStaff) ? booking.guideStaff : booking.guideStaff ? [booking.guideStaff] : []);
    setEditAssistStaff(Array.isArray(booking.assistStaff) ? booking.assistStaff : booking.assistStaff ? [booking.assistStaff] : []);
    setEditDriverStaff(booking.driverStaff || '');
    setEditRate(booking.rate?.toString() || '');
    setEditAdvance(booking.advance?.toString() || '');
    setEditExtraCharges(booking.extraCharges?.toString() || '');
    setEditDiscount(booking.discount?.toString() || '');
    setEditCommission(booking.commission?.toString() || '');
    setEditAdvanceAccount(booking.advanceAccount || '');
    setEditBalanceAccount(booking.balanceAccount || '');
    setEditGuestRemarks(booking.guestRemarks || '');
    setEditServiceRemarks(booking.serviceRemarks || '');
    setEditStaffRemarks(booking.staffRemarks || '');
    setEditLocation(booking.location || '');
  };

  // Admin Edit calculations
  useEffect(() => {
    if (!isAdminEditing) return;

    let totalBaseCalculated = 0;
    editServiceRows.forEach(row => {
      const match = prices.services.find(s => s.id === row.serviceId);
      const basePrice = match ? match.price : 0;
      const adultCost = basePrice * row.adults;
      const childCost = basePrice * row.children * 0.5;
      totalBaseCalculated += (adultCost + childCost);
    });

    setEditRate(totalBaseCalculated.toString());
  }, [editServiceRows, prices, isAdminEditing]);

  const editRateVal = parseFloat(editRate) || 0;
  const editAdvanceVal = parseFloat(editAdvance) || 0;
  const editDiscountVal = parseFloat(editDiscount) || 0;

  const editPickupVal = editSelectedAddons.includes('pickup-drop') ? (parseFloat(editCustomPickupPrice) || 0) : 0;
  const editFoodVal = editSelectedAddons.includes('food') ? (parseFloat(editCustomFoodPrice) || 0) : 0;
  const editRefreshmentVal = editSelectedAddons.includes('refreshment') ? (parseFloat(editCustomRefreshmentPrice) || 0) : 0;

  const editAddonsTotal = editPickupVal + editFoodVal + editRefreshmentVal;
  const editTotalVal = Math.max(0, editRateVal + editAddonsTotal - editDiscountVal);
  const editBalanceVal = Math.max(0, editTotalVal - editAdvanceVal);

  const editShowDriverOption = editServiceRows.some(row => row.serviceId.includes('towing') || row.serviceId.includes('boating'));
  const editIsDriverCompulsory = editServiceRows.some(row => row.serviceId.includes('towing'));

  const handleAdminServiceRowChange = (index: number, key: 'serviceId' | 'adults' | 'children', val: any) => {
    const updated = [...editServiceRows];
    updated[index] = {
      ...updated[index],
      [key]: val
    };
    setEditServiceRows(updated);
  };

  const handleAdminRemoveServiceRow = (index: number) => {
    setEditServiceRows(editServiceRows.filter((_, idx) => idx !== index));
  };

  const handleAdminAddServiceRow = () => {
    if (prices.services.length > 0) {
      setEditServiceRows([...editServiceRows, { serviceId: prices.services[0].id, adults: 1, children: 0 }]);
    }
  };

  const toggleAdminEditAddon = (id: string) => {
    setEditSelectedAddons(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleAdminToggleGuide = (name: string) => {
    setEditGuideStaff(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleAdminToggleAssist = (name: string) => {
    setEditAssistStaff(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  // Save admin updates via PUT route
  const handleSaveBookingEdits = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBookingForDetails) return;

    if (!editRegisterNumber.trim()) {
      showToast('error', 'Please enter a register number');
      return;
    }

    if (!editName.trim()) {
      showToast('error', 'Please enter guest name');
      return;
    }

    if (!editMob.trim()) {
      showToast('error', 'Please enter guest mobile number');
      return;
    }

    if (editAdults < 1) {
      showToast('error', 'Guest Adults head count is compulsory (minimum 1)');
      return;
    }

    if (!editLocation) {
      showToast('error', 'Please select a branch location');
      return;
    }

    if ((editPartner === 'Partner' || editPartner === 'Broker') && !editPartnerName.trim()) {
      showToast('error', `Please provide the ${editPartner.toLowerCase()} name`);
      return;
    }

    if (editGuideStaff.length === 0) {
      showToast('error', 'Please select at least one Guide Staff');
      return;
    }

    if (editIsDriverCompulsory && !editDriverStaff) {
      showToast('error', 'Boat Driver Staff is compulsory for Towing');
      return;
    }

    if (editAdvanceVal > 0 && !editAdvanceAccount) {
      showToast('error', 'Advance Paid Account is compulsory when advance payment is made');
      return;
    }

    if (!editBalanceAccount) {
      showToast('error', 'Balance Paid Account is compulsory');
      return;
    }

    if (editServiceRows.length === 0) {
      showToast('error', 'Please add at least one service');
      return;
    }

    setIsSubmitting(true);

    const servicesPayload = editServiceRows.map(row => {
      const originalService = prices.services.find(s => s.id === row.serviceId);
      const basePrice = originalService ? originalService.price : 0;
      const computedRowRate = (basePrice * row.adults) + (basePrice * row.children * 0.5);
      return {
        serviceId: row.serviceId,
        serviceName: originalService ? originalService.name : row.serviceId,
        adults: row.adults,
        children: row.children,
        rate: computedRowRate
      };
    });

    const payload = {
      id: selectedBookingForDetails._id,
      registerNumber: editRegisterNumber.trim(),
      entryUser: selectedBookingForDetails.entryUser,
      partner: editPartner,
      partnerName: (editPartner === 'Partner' || editPartner === 'Broker') ? editPartnerName : '',
      name: editName,
      mob: editMob,
      adults: editAdults,
      children: editChildren,
      services: servicesPayload,
      addons: editSelectedAddons.map(addonId => ADDONS.find(a => a.id === addonId)?.name || addonId),
      rate: editRateVal,
      advance: editAdvanceVal,
      advanceAccount: editAdvanceVal > 0 ? editAdvanceAccount : '',
      balanceAccount: editBalanceAccount,
      discount: editDiscountVal,
      extraCharges: parseFloat(editExtraCharges) || 0,
      balance: editBalanceVal,
      commission: editPartner === 'Walk-In' ? 0 : (parseFloat(editCommission) || 0),
      total: editTotalVal,
      guideStaff: editGuideStaff,
      assistStaff: editAssistStaff,
      driverStaff: editShowDriverOption ? editDriverStaff : '',
      customPickupPrice: editSelectedAddons.includes('pickup-drop') ? (parseFloat(editCustomPickupPrice) || 0) : 0,
      customFoodPrice: editSelectedAddons.includes('food') ? (parseFloat(editCustomFoodPrice) || 0) : 0,
      customRefreshmentPrice: editSelectedAddons.includes('refreshment') ? (parseFloat(editCustomRefreshmentPrice) || 0) : 0,
      guestRemarks: editGuestRemarks,
      serviceRemarks: editServiceRemarks,
      staffRemarks: editStaffRemarks,
      location: editLocation,
    };

    try {
      const response = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        showToast('success', 'Booking updated successfully!');
        setIsAdminEditing(false);
        setSelectedBookingForDetails(null);
        fetchBookings();
      } else {
        showToast('error', result.error || 'Failed to update booking');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Connection error updating booking log.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // CLIENT SIDE FILE COMPRESSION TO BASE64 JPEG
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Output compressed base64 jpeg at 70% quality (~35-60KB size)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setExpenseScreenshot(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submit Expense Logger Form
  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      showToast('error', 'Paid Amount must be a positive number');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      date: expenseDate,
      type: expenseType,
      amount: parseFloat(expenseAmount),
      paymentMode: expenseMode,
      screenshot: expenseScreenshot,
      remarks: expenseRemarks,
      entryUser: user?.username || 'System',
    };

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok) {
        showToast('success', 'Expense logged successfully!');
        setExpenseAmount('');
        setExpenseRemarks('');
        setExpenseScreenshot('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchExpenses();
      } else {
        showToast('error', result.error || 'Failed to submit expense');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Connection error logging expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin delete expense
  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this expense record?')) return;

    try {
      const res = await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Expense record removed.');
        fetchExpenses();
      } else {
        showToast('error', data.error || 'Failed to delete expense record');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error deleting expense');
    }
  };

  // Excel Expenses Exporter (Restricted to Admin Console)
  const handleExportExpensesToExcel = () => {
    if (expenses.length === 0) {
      showToast('error', 'No expenses available to export');
      return;
    }

    const dataToExport = expenses.map((e) => ({
      'Date': e.date,
      'Type of Expense': e.type,
      'Paid Amount (INR)': e.amount,
      'Cash / Gpay': e.paymentMode,
      'Remarks': e.remarks || '',
      'Logged By': e.entryUser,
      'Created Timestamp': new Date(e.createdAt).toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses Report");

    XLSX.writeFile(workbook, `Pokkalo_Kayaking_Club_Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('success', 'Expenses Excel report downloaded successfully!');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="w-full max-w-md mx-auto px-4 py-6 flex-1 flex flex-col gap-6 relative">
        
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-xl flex items-center gap-3 shadow-2xl transition-all duration-300 transform translate-y-0 ${
            toast.type === 'success' 
              ? 'bg-emerald-955/95 border border-emerald-500/30 text-emerald-200' 
              : 'bg-rose-955/95 border border-rose-500/30 text-rose-200'
          }`}>
            {toast.type === 'success' ? (
              <div className="bg-emerald-500 text-emerald-900 p-1 rounded-full"><Check size={16} /></div>
            ) : (
              <div className="bg-rose-500 text-rose-900 p-1 rounded-full"><AlertCircle size={16} /></div>
            )}
            <span className="text-xs font-semibold">{toast.message}</span>
          </div>
        )}

        {/* Image Preview Modal */}
        {previewImageSrc && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setPreviewImageSrc(null)}>
            <div className="relative max-w-sm max-h-[80vh] flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setPreviewImageSrc(null)}
                className="absolute -top-10 right-0 text-white font-bold bg-zinc-900 border border-zinc-800 p-2 rounded-full cursor-pointer hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImageSrc} alt="Proof screenshot" className="rounded-2xl border border-zinc-800 object-contain max-h-[70vh] shadow-2xl" />
              <div className="text-center text-xs text-zinc-400 font-medium">Click outside or X button to close preview</div>
            </div>
          </div>
        )}

        {/* 1. NO USER: RENDER LOGIN SCREEN */}
        {!user ? (
          <div className="glass-panel p-6 rounded-3xl flex flex-col gap-5 my-auto">
            <div className="text-center flex flex-col gap-1.5 pb-4 border-b border-zinc-800">
              <div className="mx-auto bg-sky-500/10 p-3 rounded-full text-sky-400 mb-2 border border-sky-500/20">
                <Lock size={28} />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Pokkalo Kayaking Club</h1>
              <p className="text-xs text-zinc-400">Enter credentials to access booking panel</p>
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
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-3 px-4 text-sm text-white placeholder-zinc-655 focus:outline-none focus:border-sky-500 transition-colors"
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
                  className="w-full bg-zinc-900 border border-zinc-855 rounded-xl py-3 px-4 text-sm text-white placeholder-zinc-655 focus:outline-none focus:border-sky-500 transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-sky-500 hover:bg-sky-400 text-zinc-955 font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-md cursor-pointer"
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
                <div className="p-2.5 bg-zinc-955 border border-zinc-900 rounded-lg text-[10px] text-emerald-400 break-words leading-normal text-center">
                  {seedStatus}
                </div>
              )}
            </div>
          </div>
        ) : (
          
          /* SIGNED IN USER - SHOW PORTAL LAYOUT WITH NAVIGATION TABS */
          <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="glass-panel p-4 rounded-2xl flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Pokkalo Kayaking Club</span>
                <h1 className="text-base font-bold text-white flex items-center gap-1.5">
                  {user.role === 'admin' ? 'Admin' : 'Staff'}: <span className="text-zinc-200">{user.username}</span>
                </h1>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1 bg-zinc-900 border border-zinc-850 hover:bg-zinc-855 text-[10px] font-semibold text-zinc-400 py-1.5 px-2.5 rounded-lg transition-all cursor-pointer"
              >
                <LogOut size={12} />
                <span>Log Out</span>
              </button>
            </div>

            {/* Tab switch Navigation Bar */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-900 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('guest')}
                className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'guest'
                    ? 'bg-sky-500 text-zinc-955 shadow-lg shadow-sky-500/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Users size={14} />
                <span>New Guest</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'expenses'
                    ? 'bg-sky-500 text-zinc-955 shadow-lg shadow-sky-500/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <DollarSign size={14} />
                <span>Expenses</span>
              </button>
            </div>

            {/* TAB VIEW 1: NEW GUEST BOOKING PORTAL */}
            {activeTab === 'guest' && (
              <>
                {user.role === 'staff' ? (
                  
                  /* Staff booking input form */
                  <form onSubmit={handleSubmitBooking} className="flex flex-col gap-5">
                    
                    {/* Guest details */}
                    <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                        <Users size={18} className="text-sky-400" />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">1. Guest Details</h2>
                      </div>

                      {/* Partner Select */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-zinc-400 font-medium">Partner Type</label>
                        <div className="grid grid-cols-3 gap-1 bg-zinc-905 p-1 rounded-xl border border-zinc-850">
                          {PARTNER_TYPES.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setPartner(type)}
                              className={`py-2 px-1 text-[10px] font-semibold rounded-lg transition-all ${
                                partner === type 
                                  ? 'bg-sky-500 text-zinc-950 shadow-md shadow-sky-500/10' 
                                  : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>

                        {/* Partner Name input */}
                        {(partner === 'Partner' || partner === 'Broker') && (
                          <div className="flex flex-col gap-1.5 mt-3 animate-in slide-in-from-top-1 duration-155">
                            <label htmlFor="staff-partner-name" className="text-xs text-zinc-455 font-semibold text-sky-405">
                              {partner === 'Partner' ? 'Partner Name' : 'Broker Name'}
                            </label>
                            <input
                              id="staff-partner-name"
                              type="text"
                              placeholder={`Enter name of ${partner.toLowerCase()}`}
                              value={partnerName}
                              onChange={(e) => setPartnerName(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500"
                              required
                            />
                          </div>
                        )}
                      </div>

                      {/* Guest Name input */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="staff-name" className="text-xs text-zinc-400 font-medium">Guest Name</label>
                        <div className="relative">
                          <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                          <input
                            id="staff-name"
                            type="text"
                            placeholder=""
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-sky-505 transition-colors"
                            required
                          />
                        </div>
                      </div>

                      {/* Mobile / Steppers Row */}
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="staff-mob" className="text-xs text-zinc-400 font-medium">Guest Mob</label>
                          <div className="relative">
                            <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                              id="staff-mob"
                              type="tel"
                              placeholder=""
                              value={mob}
                              onChange={(e) => setMob(e.target.value.replace(/[^0-9+]/g, ''))}
                              className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
                              required
                            />
                          </div>
                        </div>

                        {/* Main Guest Counter Steppers */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <EditableStepper
                            label="Guest Adults (Compulsory)"
                            value={guestAdults}
                            onChange={(val) => setGuestAdults(val)}
                            min={1}
                          />
                          <EditableStepper
                            label="Guest Children"
                            value={guestChildren}
                            onChange={(val) => setGuestChildren(val)}
                            min={0}
                          />
                        </div>
                      </div>

                      {/* Section Remarks: Guest Details */}
                      <div className="flex flex-col gap-1 mt-2.5 pt-2.5 border-t border-zinc-800/60">
                        <label htmlFor="staff-guest-remarks" className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
                          <MessageSquare size={10} />
                          <span>Remarks (Guest Details)</span>
                        </label>
                        <input
                          id="staff-guest-remarks"
                          type="text"
                          placeholder="Remarks regarding guest profiles..."
                          value={guestRemarks}
                          onChange={(e) => setGuestRemarks(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-1.5 px-2.5 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-sky-505"
                        />
                      </div>
                    </div>

                    {/* Section 2: Services selection */}
                    <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                        <Layers size={18} className="text-sky-400" />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">2. Services Selection</h2>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="staff-location-select" className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                          <MapPin size={12} className="text-sky-400" />
                          <span>Select Branch Location</span>
                        </label>
                        <select
                          id="staff-location-select"
                          value={selectedLocation}
                          onChange={(e) => setSelectedLocation(e.target.value)}
                          className="bg-zinc-900 border border-zinc-850 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-sky-500 w-full"
                          required
                        >
                          {locationsList.length === 0 ? (
                            <option value="">No locations available - Contact Admin</option>
                          ) : (
                            locationsList.map((loc) => (
                              <option key={loc._id} value={loc.name}>
                                {loc.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Services rows lists */}
                      <div className="flex flex-col gap-4 pt-2 border-t border-zinc-850">
                        <label className="text-xs text-zinc-400 font-medium">Add Services</label>
                        {serviceRows.map((row, index) => {
                          const match = prices.services.find(s => s.id === row.serviceId);
                          const basePrice = match ? match.price : 0;
                          const computedRate = (basePrice * row.adults) + (basePrice * row.children * 0.5);

                          return (
                            <div key={index} className="bg-zinc-955 p-3 rounded-xl border border-zinc-900 flex flex-col gap-3 relative">
                              <div className="flex justify-between items-center gap-2">
                                <select
                                  value={row.serviceId}
                                  onChange={(e) => handleServiceRowChange(index, 'serviceId', e.target.value)}
                                  className="bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-xs text-white w-full"
                                >
                                  {prices.services.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name} (₹{s.price})</option>
                                  ))}
                                </select>
                                {serviceRows.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveServiceRow(index)}
                                    className="p-2 bg-zinc-900 hover:bg-rose-955/35 text-rose-500 rounded-lg border border-zinc-850"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <EditableStepper
                                  label="Adults"
                                  value={row.adults}
                                  onChange={(val) => handleServiceRowChange(index, 'adults', val)}
                                  min={0}
                                />
                                <EditableStepper
                                  label="Children (50%)"
                                  value={row.children}
                                  onChange={(val) => handleServiceRowChange(index, 'children', val)}
                                  min={0}
                                />
                              </div>
                              <div className="text-right text-[10px] text-zinc-550">
                                Row Cost: <span className="font-bold text-sky-400">₹{computedRate}</span>
                              </div>
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={handleAddServiceRow}
                          className="w-full py-2 bg-zinc-900 text-sky-400 text-xs font-bold rounded-xl border border-dashed border-zinc-850 hover:bg-zinc-850"
                        >
                          + Add Service Row
                        </button>
                      </div>

                      {/* Addons Grid */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-zinc-850">
                        <label className="text-xs text-zinc-400 font-medium">Extra Add-ons</label>
                        <div className="grid grid-cols-3 gap-2">
                          {ADDONS.map((addon) => {
                            const isSelected = selectedAddons.includes(addon.id);
                            const IconComponent = addon.icon;
                            return (
                              <button
                                key={addon.id}
                                type="button"
                                onClick={() => toggleAddon(addon.id)}
                                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                                  isSelected
                                    ? 'bg-sky-500/10 border-sky-500 text-sky-300'
                                    : 'bg-zinc-900 border-zinc-850 text-zinc-400'
                                }`}
                              >
                                <IconComponent size={15} />
                                <span className="text-[9px] font-bold">{addon.name}</span>
                              </button>
                            );
                          })}
                        </div>

                        {selectedAddons.includes('pickup-drop') && (
                          <input
                            type="number"
                            placeholder="Pickup/Drop Price (₹)"
                            value={customPickupPrice}
                            onChange={(e) => setCustomPickupPrice(e.target.value)}
                            className="bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs w-full"
                            required
                          />
                        )}
                        {selectedAddons.includes('food') && (
                          <input
                            type="number"
                            placeholder="Food Price (₹)"
                            value={customFoodPrice}
                            onChange={(e) => setCustomFoodPrice(e.target.value)}
                            className="bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs w-full"
                            required
                          />
                        )}
                        {selectedAddons.includes('refreshment') && (
                          <input
                            type="number"
                            placeholder="Refreshment Price (₹)"
                            value={customRefreshmentPrice}
                            onChange={(e) => setCustomRefreshmentPrice(e.target.value)}
                            className="bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs w-full"
                            required
                          />
                        )}
                      </div>

                      {/* Remarks Services */}
                      <div className="flex flex-col gap-1 mt-2.5 pt-2.5 border-t border-zinc-800/60">
                        <label htmlFor="staff-service-remarks" className="text-[10px] text-zinc-550 font-medium flex items-center gap-1">
                          <MessageSquare size={10} />
                          <span>Remarks (Services & Add-ons)</span>
                        </label>
                        <input
                          id="staff-service-remarks"
                          type="text"
                          placeholder="Remarks regarding selected packages..."
                          value={serviceRemarks}
                          onChange={(e) => setServiceRemarks(e.target.value)}
                          className="w-full bg-zinc-955 border border-zinc-900 rounded-lg py-1.5 px-2.5 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-sky-505"
                        />
                      </div>
                    </div>

                    {/* Staff Assigned */}
                    <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                        <Briefcase size={18} className="text-sky-400" />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Staff Assigned</h2>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-zinc-400 font-semibold flex items-center justify-between">
                            <span>Guide Staff (Select Multiple)</span>
                            <span className="text-[8px] text-rose-500 font-bold uppercase tracking-wider">(Compulsory)</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5 mt-1 bg-zinc-950 p-2 rounded-xl border border-zinc-900">
                            {staffNamesList.map(name => {
                              const isSelected = guideStaff.includes(name);
                              return (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => handleToggleGuide(name)}
                                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                                    isSelected 
                                      ? 'bg-sky-500 text-zinc-955 border-sky-500 shadow-md shadow-sky-500/10' 
                                      : 'bg-zinc-900 border-zinc-850 text-zinc-405 hover:text-zinc-200'
                                  }`}
                                >
                                  {name}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 mt-1">
                          <label className="text-xs text-zinc-400 font-semibold flex items-center justify-between">
                            <span>Assist Staff (Select Multiple)</span>
                            <span className="text-[8px] text-zinc-550 font-bold uppercase tracking-wider">(Optional)</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5 mt-1 bg-zinc-955 p-2 rounded-xl border border-zinc-900">
                            {staffNamesList.map(name => {
                              const isSelected = assistStaff.includes(name);
                              return (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => handleToggleAssist(name)}
                                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                                    isSelected 
                                      ? 'bg-sky-500 text-zinc-955 border-sky-505 shadow-md shadow-sky-500/10' 
                                      : 'bg-zinc-900 border-zinc-850 text-zinc-405 hover:text-zinc-200'
                                  }`}
                                >
                                  {name}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {showDriverOption && (
                          <div className="flex flex-col gap-1.5 mt-1">
                            <label className="text-xs text-zinc-400 font-semibold">
                              <span>Boat Driver Staff</span>
                              {isDriverCompulsory && <span className="text-[8px] text-rose-500 ml-1">(Compulsory)</span>}
                            </label>
                            <select
                              value={driverStaff}
                              onChange={(e) => setDriverStaff(e.target.value)}
                              className="bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white"
                              required={isDriverCompulsory}
                            >
                              <option value="">-- Select Driver --</option>
                              {staffNamesList.map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Remarks Staff */}
                      <div className="flex flex-col gap-1 mt-2.5 pt-2.5 border-t border-zinc-800/60">
                        <label htmlFor="staff-assigned-remarks" className="text-[10px] text-zinc-550 font-medium flex items-center gap-1">
                          <MessageSquare size={10} />
                          <span>Remarks (Staff Assigned)</span>
                        </label>
                        <input
                          id="staff-assigned-remarks"
                          type="text"
                          placeholder="Remarks regarding docking crews..."
                          value={staffRemarks}
                          onChange={(e) => setStaffRemarks(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-1.5 px-2.5 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-sky-505"
                        />
                      </div>
                    </div>

                    {/* Section 3: Payment Details */}
                    <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                        <DollarSign size={18} className="text-sky-400" />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">3. Payment Details</h2>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5 col-span-2">
                          <label className="text-xs text-zinc-400 font-medium">Rate (Base)</label>
                          <input
                            type="number"
                            value={rate}
                            readOnly
                            className="w-full bg-zinc-955 border border-zinc-900 rounded-xl py-2 pl-3 text-xs text-zinc-350 font-bold"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 col-span-2 border-t border-zinc-850 pt-2">
                          <label className="text-xs text-zinc-400 font-medium">Advance Paid</label>
                          <input
                            type="number"
                            value={advance}
                            onChange={(e) => setAdvance(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white"
                          />
                        </div>

                        {advanceVal > 0 && (
                          <div className="flex flex-col gap-1.5 col-span-2">
                            <label className="text-[10px] text-sky-400 font-semibold uppercase">Advance Paid Account</label>
                            <select
                              value={advanceAccount}
                              onChange={(e) => setAdvanceAccount(e.target.value)}
                              className="bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white"
                              required
                            >
                              <option value="">-- Select --</option>
                              {staffNamesList.map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-zinc-400 font-medium">Extra Charges</label>
                          <input
                            type="number"
                            value={extraCharges}
                            onChange={(e) => setExtraCharges(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-zinc-400 font-medium">Discount</label>
                          <input
                            type="number"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 col-span-2 border-t border-zinc-850 pt-2">
                          <label className="text-xs text-zinc-400 font-medium">Commission</label>
                          <input
                            type="number"
                            value={commission}
                            onChange={(e) => setCommission(e.target.value)}
                            disabled={partner === 'Walk-In'}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white disabled:opacity-40"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 col-span-2 border-t border-zinc-850 pt-2">
                          <label className="text-xs text-zinc-400 font-medium">Balance Due</label>
                          <input
                            type="text"
                            readOnly
                            value={balanceVal}
                            className="w-full bg-zinc-955 border border-zinc-900 rounded-xl py-2 px-3 text-xs text-amber-400 font-bold"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 col-span-2">
                          <label className="text-[10px] text-sky-400 font-semibold uppercase">Balance Paid Account</label>
                          <select
                            value={balanceAccount}
                            onChange={(e) => setBalanceAccount(e.target.value)}
                            className="bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-505"
                            required
                          >
                            <option value="">-- Select --</option>
                            {staffNamesList.map(n => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 flex justify-between items-center mt-2">
                        <span className="text-[10px] text-sky-400 font-bold uppercase">Total Bill</span>
                        <span className="text-lg font-black text-white">₹{totalVal}</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-sky-500 hover:bg-sky-405 text-zinc-955 font-bold py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <span>Submit Booking</span>}
                    </button>
                  </form>
                ) : (
                  
                  /* Admin Registry Logs & Configuration */
                  <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                    {/* Admin Pricing / staff configurations */}
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
                            className="text-[9px] text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800"
                          >
                            <Download size={10} />
                            <span>Export Logs</span>
                          </button>
                          <button 
                            type="button" 
                            onClick={fetchBookings} 
                            className="text-[9px] text-sky-400 font-bold"
                          >
                            Sync
                          </button>
                        </div>
                      </div>

                      {isLoadingBookings ? (
                        <div className="py-6 text-center text-zinc-550 text-xs flex items-center justify-center gap-1.5">
                          <Loader2 size={14} className="animate-spin" />
                          <span>Syncing bookings data...</span>
                        </div>
                      ) : bookings.length === 0 ? (
                        <div className="py-6 text-center text-zinc-555 text-xs">No entries submitted.</div>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                          {bookings.map((booking) => (
                            <div 
                              key={booking._id}
                              className="bg-zinc-950 border border-zinc-900 rounded-lg p-2.5 flex flex-col gap-1 text-[10px] relative hover:border-zinc-805 transition-colors"
                            >
                              <div 
                                onClick={() => handleOpenDetailedModal(booking)}
                                className="cursor-pointer flex flex-col gap-1 pr-6"
                              >
                                <div className="flex justify-between items-start">
                                  <span className="font-bold text-zinc-200">{booking.name} ({booking.registerNumber || 'N/A'})</span>
                                  <span className="font-black text-emerald-400">₹{booking.total}</span>
                                </div>
                                <div className="text-[9px] text-zinc-400 leading-tight">
                                  <strong>Services:</strong> {booking.services.map(s => `${s.serviceName} (x${s.adults}A, ${s.children}C)`).join(', ')}
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 text-[8px] text-zinc-500 border-t border-zinc-900/60 pt-1 mt-1 font-semibold">
                                  <span>Guides: {Array.isArray(booking.guideStaff) ? booking.guideStaff.join(', ') : booking.guideStaff}</span>
                                  <span className="text-right text-sky-400">Location: {booking.location}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteBooking(booking._id, booking.name)}
                                className="absolute right-2 top-2 p-1.5 bg-zinc-900 hover:bg-rose-955 text-rose-500 hover:text-white rounded-md border border-zinc-850 cursor-pointer"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Manage Location Branches */}
                    <div className="glass-panel p-4 rounded-2xl flex flex-col gap-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                        <MapPin size={16} className="text-sky-400" />
                        <span>Manage Locations (Branches)</span>
                      </h3>

                      <form onSubmit={handleCreateLocation} className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 flex flex-col gap-2.5">
                        <input
                          type="text"
                          placeholder="Location / Branch Name (e.g. Varkala)"
                          value={newLocationName}
                          onChange={(e) => setNewLocationName(e.target.value)}
                          className="bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                          required
                        />
                        <button
                          type="submit"
                          className="w-full bg-sky-500 hover:bg-sky-405 text-zinc-955 font-bold py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          + Add Location Branch
                        </button>
                      </form>

                      {locationsList.length > 0 && (
                        <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                          {locationsList.map((loc) => (
                            <div key={loc._id} className="bg-zinc-900/60 rounded-lg py-1.5 px-2.5 flex justify-between items-center text-xs border border-zinc-850">
                              <span className="font-semibold text-zinc-200">{loc.name}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteLocation(loc._id, loc.name)}
                                className="text-rose-500"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Customize Services Prices */}
                    <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                        <DollarSign size={16} className="text-amber-500" />
                        <span>Customize Prices</span>
                      </h3>
                      
                      <form onSubmit={handleSavePrices} className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                          {priceFormServices.map((srv, idx) => (
                            <div key={idx} className="bg-zinc-955 p-2.5 rounded-xl border border-zinc-900 flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Service Name"
                                value={srv.name}
                                onChange={(e) => handleAdminServiceChange(idx, 'name', e.target.value)}
                                className="bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-xs text-white w-full"
                                required
                              />
                              <input
                                type="number"
                                placeholder="Price"
                                value={srv.price}
                                onChange={(e) => handleAdminServiceChange(idx, 'price', parseInt(e.target.value) || 0)}
                                className="bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2 text-xs text-white w-20 text-center"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => handleAdminDeleteService(idx)}
                                className="p-1.5 bg-zinc-900 hover:bg-rose-955 text-rose-500 rounded border border-zinc-850"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleAdminAddService}
                          className="w-full py-2 bg-zinc-900 text-sky-400 text-xs font-bold rounded-xl border border-dashed border-zinc-850"
                        >
                          + Add Custom Service
                        </button>

                        <button
                          type="submit"
                          disabled={adminLoading}
                          className="w-full bg-amber-500 hover:bg-amber-405 text-zinc-955 font-bold py-2.5 rounded-xl text-xs"
                        >
                          {adminLoading ? 'Saving...' : 'Save Customizable Prices'}
                        </button>
                      </form>
                    </div>

                    {/* Manage Staff Accounts */}
                    <div className="glass-panel p-4 rounded-2xl flex flex-col gap-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1">
                        <Briefcase size={14} className="text-sky-400" />
                        <span>Manage Staff Accounts</span>
                      </h3>

                      <form onSubmit={handleCreateStaff} className="bg-zinc-955 p-3 rounded-xl border border-zinc-900 flex flex-col gap-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Username"
                            value={newStaffUser}
                            onChange={(e) => setNewStaffUser(e.target.value)}
                            className="bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-xs text-white"
                            required
                          />
                          <input
                            type="password"
                            placeholder="Password"
                            value={newStaffPassword}
                            onChange={(e) => setNewStaffPassword(e.target.value)}
                            className="bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-xs text-white"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-sky-500 hover:bg-sky-405 text-zinc-955 font-bold py-1.5 rounded-lg text-xs"
                        >
                          Create Staff Account
                        </button>
                      </form>

                      {staffList.length > 0 && (
                        <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                          {staffList.map((member) => (
                            <div key={member._id} className="bg-zinc-900/60 rounded-lg py-1.5 px-2.5 flex justify-between items-center text-xs border border-zinc-850">
                              <span className="font-semibold text-zinc-200">{member.username}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(member.username)}
                                className="text-rose-500"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB VIEW 2: EXPENSES LOG TABLE & ENTRY FORM */}
            {activeTab === 'expenses' && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                
                {/* Expense Entry Form */}
                <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                    <DollarSign size={18} className="text-sky-400" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Log New Expense</h2>
                  </div>

                  <form onSubmit={handleSubmitExpense} className="flex flex-col gap-4">
                    
                    {/* Expense Date */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="exp-date" className="text-xs text-zinc-400 font-medium">Expense Date</label>
                      <input
                        id="exp-date"
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-505 w-full"
                        required
                      />
                    </div>

                    {/* Expense Category Type */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="exp-category" className="text-xs text-zinc-400 font-medium">Type of Expense</label>
                      <select
                        id="exp-category"
                        value={expenseType}
                        onChange={(e) => setExpenseType(e.target.value)}
                        className="bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500 w-full"
                        required
                      >
                        <option value="Fuel">Fuel</option>
                        <option value="Salaries / Wages">Salaries / Wages</option>
                        <option value="Boat Maintenance & Repairs">Boat Maintenance & Repairs</option>
                        <option value="Rent / Lease">Rent / Lease</option>
                        <option value="Food & Staff Refreshments">Food & Staff Refreshments</option>
                        <option value="Office & Dock Supplies">Office & Dock Supplies</option>
                        <option value="Electricity & Utility Bills">Electricity & Utility Bills</option>
                        <option value="Others / Miscellaneous">Others / Miscellaneous</option>
                      </select>
                    </div>

                    {/* Paid Amount */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="exp-amount" className="text-xs text-zinc-400 font-medium">Paid Amount (₹)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-550 text-xs">₹</span>
                        <input
                          id="exp-amount"
                          type="number"
                          placeholder="Amount in Rupees"
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-sky-505"
                          required
                        />
                      </div>
                    </div>

                    {/* Cash / Gpay Mode Selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-400 font-medium">Payment Mode</label>
                      <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-850">
                        {(['Cash', 'Gpay'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setExpenseMode(mode)}
                            className={`py-2 text-xs font-bold rounded-lg transition-all ${
                              expenseMode === mode
                                ? 'bg-sky-500 text-zinc-950 shadow-md shadow-sky-500/10'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* File Attachment Proof - Resizes client side automatically */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="exp-file" className="text-xs text-zinc-400 font-medium">Bill / Gpay Screenshot Proof</label>
                      <div className="flex items-center gap-3">
                        <input
                          id="exp-file"
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="py-2.5 px-4 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 rounded-xl text-xs font-bold text-zinc-300 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <ImageIcon size={14} className="text-sky-400" />
                          <span>Choose Receipt Image</span>
                        </button>
                        
                        {expenseScreenshot && (
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={expenseScreenshot}
                              alt="Thumbnail preview"
                              className="w-10 h-10 rounded-lg object-cover border border-zinc-800 cursor-pointer"
                              onClick={() => setPreviewImageSrc(expenseScreenshot)}
                            />
                            <button
                              type="button"
                              onClick={() => setExpenseScreenshot('')}
                              className="absolute -top-1.5 -right-1.5 bg-rose-500 text-zinc-950 p-0.5 rounded-full cursor-pointer hover:bg-rose-400"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-[8px] text-zinc-550 leading-relaxed font-mono block">Images are auto-resized client-side to keep DB storage footprint lightweight.</span>
                    </div>

                    {/* Remarks */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="exp-remarks" className="text-xs text-zinc-400 font-medium">Remarks</label>
                      <input
                        id="exp-remarks"
                        type="text"
                        placeholder="Add details regarding this expense..."
                        value={expenseRemarks}
                        onChange={(e) => setExpenseRemarks(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-855 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-505"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-sky-500 hover:bg-sky-405 text-zinc-955 font-bold py-3.5 rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <span>Log Expense</span>}
                    </button>
                  </form>
                </div>

                {/* Expenses Log Table Roster (Six Columns + User Column) */}
                <div className="glass-panel p-4 rounded-2xl flex flex-col gap-3 max-w-full overflow-hidden">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Expenses Registry</h3>
                      {user.role === 'admin' && (
                        <span className="text-[9px] text-zinc-500">Expenses Gross: <strong className="text-rose-455">₹{totalExpenseSum}</strong></span>
                      )}
                    </div>
                    
                    {user.role === 'admin' && (
                      <button
                        type="button"
                        onClick={handleExportExpensesToExcel}
                        className="text-[9px] text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800"
                      >
                        <Download size={10} />
                        <span>Export Expenses</span>
                      </button>
                    )}
                  </div>

                  {isLoadingExpenses ? (
                    <div className="py-6 text-center text-zinc-550 text-xs flex items-center justify-center gap-1.5">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Loading expenses roster...</span>
                    </div>
                  ) : expenses.length === 0 ? (
                    <div className="py-6 text-center text-zinc-655 text-xs">No expenses logged.</div>
                  ) : (
                    <div className="w-full overflow-x-auto select-none rounded-xl border border-zinc-900">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-zinc-950 text-zinc-400 border-b border-zinc-900">
                            <th className="p-2 font-bold whitespace-nowrap">Date</th>
                            <th className="p-2 font-bold whitespace-nowrap">Type of expense</th>
                            <th className="p-2 font-bold whitespace-nowrap">Paid Amount</th>
                            <th className="p-2 font-bold whitespace-nowrap">Cash/Gpay</th>
                            <th className="p-2 font-bold whitespace-nowrap">Bill/Gpay screenshot</th>
                            <th className="p-2 font-bold whitespace-nowrap">Remarks</th>
                            <th className="p-2 font-bold whitespace-nowrap">User</th>
                            {user.role === 'admin' && <th className="p-2 font-bold text-center">Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900 bg-zinc-900/20">
                          {expenses.map((exp) => (
                            <tr key={exp._id} className="hover:bg-zinc-900/40 text-zinc-300">
                              <td className="p-2 whitespace-nowrap font-medium">{exp.date}</td>
                              <td className="p-2 whitespace-nowrap">{exp.type}</td>
                              <td className="p-2 whitespace-nowrap text-rose-400 font-bold">₹{exp.amount}</td>
                              <td className="p-2 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${
                                  exp.paymentMode === 'Cash' 
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                }`}>
                                  {exp.paymentMode}
                                </span>
                              </td>
                              <td className="p-2 whitespace-nowrap">
                                {exp.screenshot ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImageSrc(exp.screenshot || null)}
                                    className="text-[9px] text-sky-400 hover:text-sky-305 underline font-bold"
                                  >
                                    View Proof
                                  </button>
                                ) : (
                                  <span className="text-zinc-600 italic">No Proof</span>
                                )}
                              </td>
                              <td className="p-2 whitespace-nowrap truncate max-w-[120px]" title={exp.remarks}>
                                {exp.remarks || '-'}
                              </td>
                              <td className="p-2 whitespace-nowrap font-semibold text-zinc-400">{exp.entryUser}</td>
                              {user.role === 'admin' && (
                                <td className="p-2 whitespace-nowrap text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteExpense(exp._id)}
                                    className="text-rose-500 hover:text-rose-400 p-1"
                                    title="Delete expense entry"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}

// Reusable Stepper Component (With Editable Inputs)
const EditableStepper = ({ 
  label, 
  value, 
  onChange, 
  min = 0 
}: { 
  label?: string; 
  value: number; 
  onChange: (val: number) => void; 
  min?: number 
}) => {
  const [inputValue, setInputValue] = useState<string>(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep local state in sync when value changes externally, unless input is focused
  useEffect(() => {
    if (document.activeElement === inputRef.current) {
      return;
    }
    setInputValue(value.toString());
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setInputValue(valStr);
    if (valStr !== '') {
      const parsed = parseInt(valStr, 10);
      if (!isNaN(parsed)) {
        onChange(Math.max(min, parsed));
      }
    }
  };

  const handleBlur = () => {
    if (inputValue === '' || isNaN(parseInt(inputValue, 10))) {
      setInputValue(min.toString());
      onChange(min);
    } else {
      const parsed = parseInt(inputValue, 10);
      const clamped = Math.max(min, parsed);
      setInputValue(clamped.toString());
      onChange(clamped);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-[10px] text-zinc-400 font-semibold">{label}</label>}
      <div className="flex items-center justify-between bg-zinc-955 border border-zinc-900 rounded-xl p-1 w-full">
        <button
          type="button"
          onClick={() => {
            const newVal = Math.max(min, value - 1);
            setInputValue(newVal.toString());
            onChange(newVal);
          }}
          className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-855 hover:bg-zinc-800 text-white font-bold flex items-center justify-center transition-all active:scale-95 text-xs"
        >
          -
        </button>
        <input
          ref={inputRef}
          type="number"
          min={min}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="w-10 text-center text-xs font-black text-white bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => {
            const newVal = value + 1;
            setInputValue(newVal.toString());
            onChange(newVal);
          }}
          className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-white font-bold flex items-center justify-center transition-all active:scale-95 text-xs"
        >
          +
        </button>
      </div>
    </div>
  );
};
