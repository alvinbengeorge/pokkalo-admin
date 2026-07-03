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
  Download,
  Link,
  Tag,
  MessageSquare
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
  guideStaff: string;
  assistStaff: string;
  customPickupPrice?: number;
  customFoodPrice?: number;
  customRefreshmentPrice?: number;
  guestRemarks?: string;
  serviceRemarks?: string;
  staffRemarks?: string;
  location: string;
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

  // Dynamic Prices State
  const [prices, setPrices] = useState<{
    services: ServicePricingConfig[];
    addons: Record<string, number>;
  }>({
    services: [
      { id: 'sunrise-kayaking', name: 'Sunrise Kayaking', price: 1200 },
      { id: 'sunset-kayaking', name: 'Sun Set Kayaking', price: 1505 },
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

  // Staff Assignment State
  const [guideStaff, setGuideStaff] = useState('');
  const [assistStaff, setAssistStaff] = useState('');

  // Form Fields State (Staff view)
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

  // Custom Pricing Fields for addons
  const [customPickupPrice, setCustomPickupPrice] = useState<string>('');
  const [customFoodPrice, setCustomFoodPrice] = useState<string>('');
  const [customRefreshmentPrice, setCustomRefreshmentPrice] = useState<string>('');

  // Remarks per section
  const [guestRemarks, setGuestRemarks] = useState('');
  const [serviceRemarks, setServiceRemarks] = useState('');
  const [staffRemarks, setStaffRemarks] = useState('');

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
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<BookingRecord | null>(null);

  // Load customizable prices from API
  const fetchPrices = async () => {
    try {
      const res = await fetch('/api/prices');
      if (res.ok) {
        const data = await res.json();
        let servicesArray: ServicePricingConfig[] = [];
        if (Array.isArray(data.services)) {
          servicesArray = data.services;
        } else if (data.services && typeof data.services === 'object') {
          const defaultNames: Record<string, string> = {
            'sunrise-kayaking': 'Sunrise Kayaking',
            'sunset-kayaking': 'Sun Set Kayaking',
            'towing': 'Towing',
            'boating': 'Boating',
            'fishing': 'Fishing',
            'bioluminescence-boating': 'Bioluminescence Boating',
            'bioluminescence-kayaking': 'Bioluminescence Kayaking',
          };
          servicesArray = Object.entries(data.services).map(([id, price]) => ({
            id,
            name: defaultNames[id] || id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            price: Number(price) || 0
          }));
        }

        if (servicesArray.length === 0) {
          servicesArray = [
            { id: 'sunrise-kayaking', name: 'Sunrise Kayaking', price: 1200 },
            { id: 'sunset-kayaking', name: 'Sun Set Kayaking', price: 1500 },
            { id: 'towing', name: 'Towing', price: 800 },
            { id: 'boating', name: 'Boating', price: 2000 },
            { id: 'fishing', name: 'Fishing', price: 2500 },
            { id: 'bioluminescence-boating', name: 'Bioluminescence Boating', price: 1800 },
            { id: 'bioluminescence-kayaking', name: 'Bioluminescence Kayaking', price: 2200 }
          ];
        }

        const normalizedData = {
          services: servicesArray,
          addons: data.addons || {},
        };

        setPrices(normalizedData);
        setPriceFormServices(servicesArray);
        
        // Initialize default service row on staff side if none exists
        if (servicesArray.length > 0 && serviceRows.length === 0) {
          setServiceRows([{ serviceId: servicesArray[0].id, adults: 1, children: 0 }]);
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
      fetchStaffList();
      fetchLocations();
    }
  }, [user, fetchBookings, fetchStaffList, fetchLocations]);

  // Force commission to 0 and disable it when Walk-In is selected
  useEffect(() => {
    if (partner === 'Walk-In') {
      setCommission('0');
    }
  }, [partner]);

  // Initialize/validate serviceRows when dynamic prices load or update
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
      'Guide Roster': b.guideStaff,
      'Assist Roster': b.assistStaff,
      'Rate (Base)': b.rate,
      'Advance Paid': b.advance,
      'Extra Charges (Isolated)': b.extraCharges || 0,
      'Discount Applied': b.discount || 0,
      'Balance Due': b.balance,
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
    setGuideStaff('');
    setAssistStaff('');
    setRate('');
    setAdvance('');
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

    if (!selectedLocation) {
      showToast('error', 'Please select a branch location');
      return;
    }

    if ((partner === 'Partner' || partner === 'Broker') && !partnerName.trim()) {
      showToast('error', `Please provide the ${partner.toLowerCase()} name`);
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
      discount: discountVal,
      extraCharges: parseFloat(extraCharges) || 0,
      balance: balanceVal,
      commission: partner === 'Walk-In' ? 0 : (parseFloat(commission) || 0),
      total: totalVal,
      guideStaff,
      assistStaff,
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

    // Keep local state in sync when value changes externally
    useEffect(() => {
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
        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-900 rounded-xl p-1 w-full">
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

  return (
    <div className="min-h-screen flex flex-col">
      <main className="w-full max-w-md mx-auto px-4 py-6 flex-1 flex flex-col gap-6 relative">
        
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-xl flex items-center gap-3 shadow-2xl transition-all duration-300 transform translate-y-0 ${
            toast.type === 'success' 
              ? 'bg-emerald-950/95 border border-emerald-500/30 text-emerald-200' 
              : 'bg-rose-955/95 border border-rose-500/30 text-rose-200'
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
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Pokkalo Kayaking Club</span>
                <h1 className="text-base font-bold text-white flex items-center gap-1.5">
                  Staff: <span className="text-zinc-200">{user.username}</span>
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
                  <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-850">
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

                  {/* Conditional input: Broker Name or Partner Name */}
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

                {/* Guest Name Input */}
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
                      label="Guest Adults"
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

              {/* Section 2: Services */}
              <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                  <Layers size={18} className="text-sky-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">2. Services Selection</h2>
                </div>

                {/* Location / Branch Dropdown Selector */}
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

                {/* Service Rows Dynamic List */}
                <div className="flex flex-col gap-4 pt-2 border-t border-zinc-850">
                  <label className="text-xs text-zinc-400 font-medium">Add Services</label>
                  
                  {serviceRows.map((row, index) => {
                    const match = prices.services.find(s => s.id === row.serviceId);
                    const basePrice = match ? match.price : 0;
                    const calculatedRowRate = (basePrice * row.adults) + (basePrice * row.children * 0.5);

                    return (
                      <div 
                        key={index} 
                        className="bg-zinc-955 p-3 rounded-xl border border-zinc-900 flex flex-col gap-3 relative animate-in slide-in-from-top-1 duration-150"
                      >
                        {/* Selector / Delete Row */}
                        <div className="flex justify-between items-center gap-2">
                          <select
                            value={row.serviceId}
                            onChange={(e) => handleServiceRowChange(index, 'serviceId', e.target.value)}
                            className="bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-sky-500 w-full"
                          >
                            {prices.services.map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name} (₹{service.price})
                              </option>
                            ))}
                          </select>
                          {serviceRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveServiceRow(index)}
                              className="p-2 bg-zinc-900 hover:bg-rose-955/35 text-rose-500 rounded-lg border border-zinc-850 hover:border-rose-900/60 transition-colors active:scale-95"
                              title="Remove service row"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* Steppers for Row */}
                        <div className="grid grid-cols-2 gap-3">
                          <EditableStepper
                            label="Adults"
                            value={row.adults}
                            onChange={(val) => handleServiceRowChange(index, 'adults', val)}
                            min={0}
                          />
                          <EditableStepper
                            label="Children (50% Cost)"
                            value={row.children}
                            onChange={(val) => handleServiceRowChange(index, 'children', val)}
                            min={0}
                          />
                        </div>

                        {/* Row Subtotal readout */}
                        <div className="text-right text-[10px] text-zinc-550">
                          Row Cost: <span className="font-bold text-sky-400">₹{calculatedRowRate}</span>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleAddServiceRow}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-sky-400 hover:text-sky-300 text-xs font-bold rounded-xl border border-zinc-855 border-dashed hover:border-sky-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <Plus size={13} />
                    <span>Add Service Row</span>
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
                              : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:border-zinc-750'
                          }`}
                        >
                          <IconComponent size={15} />
                          <span className="text-[9px] font-bold leading-tight">{addon.name}</span>
                          <span className="text-[8px] opacity-60">+Custom</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* CUSTOM ADDON PRICING INPUTS */}
                  {selectedAddons.includes('pickup-drop') && (
                    <div className="flex flex-col gap-1.5 mt-2 animate-in slide-in-from-top-1 duration-150">
                      <label htmlFor="staff-pickup-price" className="text-[10px] text-zinc-400 font-medium">Pickup/Drop Total Price (₹)</label>
                      <input
                        id="staff-pickup-price"
                        type="number"
                        placeholder="Enter custom pickup & drop cost"
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
                        placeholder="Enter custom food cost"
                        value={customFoodPrice}
                        onChange={(e) => setCustomFoodPrice(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500"
                        required
                      />
                    </div>
                  )}
                  {selectedAddons.includes('refreshment') && (
                    <div className="flex flex-col gap-1.5 mt-2 animate-in slide-in-from-top-1 duration-150">
                      <label htmlFor="staff-refreshment-price" className="text-[10px] text-zinc-400 font-medium">Refreshment Total Price (₹)</label>
                      <input
                        id="staff-refreshment-price"
                        type="number"
                        placeholder="Enter custom refreshments cost"
                        value={customRefreshmentPrice}
                        onChange={(e) => setCustomRefreshmentPrice(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-505"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Section Remarks: Services */}
                <div className="flex flex-col gap-1 mt-2.5 pt-2.5 border-t border-zinc-800/60">
                  <label htmlFor="staff-service-remarks" className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
                    <MessageSquare size={10} />
                    <span>Remarks (Services & Add-ons)</span>
                  </label>
                  <input
                    id="staff-service-remarks"
                    type="text"
                    placeholder="Remarks regarding selected packages..."
                    value={serviceRemarks}
                    onChange={(e) => setServiceRemarks(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-1.5 px-2.5 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-sky-505"
                  />
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

                {/* Section Remarks: Staff Assigned */}
                <div className="flex flex-col gap-1 mt-2.5 pt-2.5 border-t border-zinc-800/60">
                  <label htmlFor="staff-assigned-remarks" className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
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
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="staff-rate" className="text-xs text-zinc-400 font-medium">Rate (Base)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">₹</span>
                      <input
                        id="staff-rate"
                        type="number"
                        placeholder="0"
                        value={rate}
                        readOnly
                        className="w-full bg-zinc-955 border border-zinc-900 rounded-xl py-2 pl-7 pr-3 text-xs text-zinc-300 font-semibold cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="staff-advance" className="text-xs text-zinc-400 font-medium">Advance Paid</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-555 text-xs">₹</span>
                      <input
                        id="staff-advance"
                        type="number"
                        placeholder="0"
                        value={advance}
                        onChange={(e) => setAdvance(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-sky-505 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="staff-extra-charges" className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                      <span>Extra Charges</span>
                      <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">(Isolated)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-555 text-xs">₹</span>
                      <input
                        id="staff-extra-charges"
                        type="number"
                        placeholder="0"
                        value={extraCharges}
                        onChange={(e) => setExtraCharges(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-855 rounded-xl py-2 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="staff-discount" className="text-xs text-zinc-400 font-medium">Discount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-555 text-xs">₹</span>
                      <input
                        id="staff-discount"
                        type="number"
                        placeholder="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-sky-555 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label htmlFor="staff-commission" className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                      <span>Commission</span>
                      {partner === 'Walk-In' && (
                        <span className="text-[8px] text-rose-500 font-bold uppercase tracking-wider">(No Walk-In Commission)</span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-555 text-xs">₹</span>
                      <input
                        id="staff-commission"
                        type="number"
                        placeholder="0"
                        value={commission}
                        onChange={(e) => setCommission(e.target.value)}
                        disabled={partner === 'Walk-In'}
                        className={`w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-sky-505 transition-colors ${
                          partner === 'Walk-In' ? 'opacity-40 cursor-not-allowed bg-zinc-950 border-rose-500/20' : ''
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 col-span-2 border-t border-zinc-850 pt-3">
                    <label className="text-xs text-zinc-400 font-medium">Balance Due</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-555 text-xs">₹</span>
                      <input
                        type="text"
                        readOnly
                        value={balanceVal}
                        className="w-full bg-zinc-955 border border-zinc-900 rounded-xl py-2.5 pl-7 pr-3 text-xs text-amber-400 font-bold cursor-not-allowed"
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
                <button 
                  type="button" 
                  onClick={fetchBookings} 
                  className="text-[9px] text-sky-400 hover:text-sky-300 font-semibold"
                >
                  Refresh
                </button>
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
                          <span>{booking.name} ({booking.location})</span>
                          <span className="text-sky-400">₹{booking.total}</span>
                        </div>
                        <div className="text-[8px] text-zinc-550 truncate">
                          Services: {booking.services.map(s => s.serviceName).join(', ')}
                        </div>
                        <div className="flex justify-between text-[7px] text-zinc-650 mt-1">
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
                <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Pokkalo Controller</span>
                <h1 className="text-base font-black text-white">Admin Console</h1>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-[10px] font-semibold text-zinc-400 py-1.5 px-3 rounded-lg transition-all cursor-pointer"
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

            {/* Manage Location Branches */}
            <div className="glass-panel p-4 rounded-2xl flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <MapPin size={16} className="text-sky-400" />
                <span>Manage Locations (Branches)</span>
              </h3>

              {/* Add Location Form */}
              <form onSubmit={handleCreateLocation} className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 flex flex-col gap-2.5">
                <input
                  type="text"
                  placeholder="Location / Branch Name (e.g. Varkala)"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-sky-500"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-sky-500 hover:bg-sky-400 text-zinc-955 font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add Location Branch</span>
                </button>
              </form>

              {/* List Locations */}
              {locationsList.length === 0 ? (
                <div className="text-center py-2 text-[10px] text-zinc-650">No locations configured. Add branch above.</div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                  {locationsList.map((loc) => (
                    <div key={loc._id} className="bg-zinc-900/60 rounded-lg py-1.5 px-2.5 flex justify-between items-center text-xs border border-zinc-855/60">
                      <span className="font-semibold text-zinc-200">{loc.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(loc._id, loc.name)}
                        className="text-rose-500 hover:text-rose-450 p-1 rounded-md"
                        title="Delete branch location"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Price Customization Section with custom additions/deletions */}
            <div className="glass-panel p-4 rounded-2xl flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <DollarSign size={16} className="text-amber-500" />
                <span>Customize Prices</span>
              </h3>
              
              <form onSubmit={handleSavePrices} className="flex flex-col gap-3">
                <div className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Services Base Rates (₹)</div>
                
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                  {Array.isArray(priceFormServices) && priceFormServices.map((srv, idx) => (
                    <div key={idx} className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 flex flex-col gap-2 relative">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Service Name"
                          value={srv.name}
                          onChange={(e) => handleAdminServiceChange(idx, 'name', e.target.value)}
                          className="bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-zinc-650 w-full"
                          required
                        />
                        <input
                          type="number"
                          placeholder="Price"
                          value={srv.price}
                          onChange={(e) => handleAdminServiceChange(idx, 'price', parseInt(e.target.value) || 0)}
                          className="bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2 text-xs text-white placeholder-zinc-650 w-20 text-center"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleAdminDeleteService(idx)}
                          className="p-1.5 bg-zinc-900 hover:bg-rose-955/35 text-rose-500 rounded-lg border border-zinc-850"
                          title="Remove custom service"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAdminAddService}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-sky-400 hover:text-sky-305 text-xs font-bold rounded-xl border border-zinc-855 border-dashed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Custom Service</span>
                </button>

                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-550 text-zinc-955 font-bold py-2.5 rounded-xl text-xs mt-2 transition-colors cursor-pointer"
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
              <form onSubmit={handleCreateStaff} className="bg-zinc-955 p-3 rounded-xl border border-zinc-900 flex flex-col gap-2.5">
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
                    className="bg-zinc-900 border border-zinc-855 rounded-lg py-1.5 px-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-sky-500 hover:bg-sky-400 text-zinc-955 font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
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
                <div className="text-center py-2 text-[10px] text-zinc-655">No staff members configured. Use form above to add.</div>
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
                        className="text-rose-500 hover:text-rose-455 p-1 rounded-md transition-colors"
                        title="Delete account"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bookings log table */}
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
                    className="text-[9px] text-sky-400 hover:text-sky-305 font-semibold"
                  >
                    Sync
                  </button>
                </div>
              </div>

              {isLoadingBookings ? (
                <div className="py-6 text-center text-zinc-550 text-xs flex items-center justify-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Syncing cloud databases...</span>
                </div>
              ) : bookings.length === 0 ? (
                <div className="py-6 text-center text-zinc-555 text-xs">No entries submitted.</div>
              ) : (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                  {bookings.map((booking) => (
                    <div 
                      key={booking._id}
                      className="bg-zinc-950 border border-zinc-900 rounded-lg p-2.5 flex flex-col gap-1 text-[10px] relative hover:border-zinc-805 transition-colors"
                    >
                      {/* Clickable Card Body */}
                      <div 
                        onClick={() => setSelectedBookingForDetails(booking)}
                        className="cursor-pointer flex flex-col gap-1 pr-6"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-zinc-200">{booking.name} ({booking.location})</span>
                          <span className="font-black text-emerald-400">₹{booking.total}</span>
                        </div>
                        <div className="text-[9px] text-zinc-400 leading-tight">
                          <strong>Services:</strong> {booking.services.map(s => `${s.serviceName} (x${s.adults}A, ${s.children}C)`).join(', ')}
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 text-[8px] text-zinc-500 border-t border-zinc-900/60 pt-1 mt-1">
                          <span>By: <strong className="text-zinc-400">{booking.entryUser}</strong> ({booking.partner})</span>
                          <span className="text-right">Adv: ₹{booking.advance} | Bal: ₹{booking.balance}</span>
                        </div>
                      </div>

                      {/* Absolute delete button for Admin */}
                      <button
                        type="button"
                        onClick={() => handleDeleteBooking(booking._id, booking.name)}
                        className="absolute right-2 top-2 p-1.5 bg-zinc-900 hover:bg-rose-955 text-rose-500 hover:text-white rounded-md border border-zinc-850 hover:border-rose-900 transition-all cursor-pointer"
                        title="Delete log permanently"
                      >
                        <Trash2 size={11} />
                      </button>
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
                  <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider font-mono">Pokkalo Booking Details</span>
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
                    <span className="text-zinc-500 text-[10px] font-medium">Branch Location</span>
                    <span className="text-zinc-200 font-semibold text-sky-400">{selectedBookingForDetails.location || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-[10px] font-medium">Log Date</span>
                    <span className="text-zinc-400 text-[10px]">{new Date(selectedBookingForDetails.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Guest Details */}
                <div className="flex flex-col gap-1 pt-1">
                  <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">Guest & Channel</div>
                  <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850/60 flex flex-col gap-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[9px] text-zinc-500">Guest Mobile</div>
                        <div className="font-semibold text-white">{selectedBookingForDetails.mob}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-zinc-500">Group Breakdown</div>
                        <div className="font-semibold text-white">{selectedBookingForDetails.adults} Adults, {selectedBookingForDetails.children} Children</div>
                      </div>
                    </div>
                    <div className="border-t border-zinc-855 pt-1.5 mt-1">
                      <div className="text-[9px] text-zinc-500">Partner Channel</div>
                      <div className="font-semibold text-white">
                        {selectedBookingForDetails.partner} 
                        {selectedBookingForDetails.partnerName && ` (${selectedBookingForDetails.partnerName})`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Remarks */}
                {(selectedBookingForDetails.guestRemarks || selectedBookingForDetails.serviceRemarks || selectedBookingForDetails.staffRemarks) && (
                  <div className="flex flex-col gap-1 pt-1">
                    <div className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">Log Section Remarks</div>
                    <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850/60 flex flex-col gap-2">
                      {selectedBookingForDetails.guestRemarks && (
                        <div>
                          <div className="text-[8px] text-zinc-500 uppercase tracking-wide">Guest Details</div>
                          <p className="text-zinc-200 text-[10px] italic">"{selectedBookingForDetails.guestRemarks}"</p>
                        </div>
                      )}
                      {selectedBookingForDetails.serviceRemarks && (
                        <div className={`${selectedBookingForDetails.guestRemarks ? 'border-t border-zinc-850 pt-1.5' : ''}`}>
                          <div className="text-[8px] text-zinc-500 uppercase tracking-wide">Services & Addons</div>
                          <p className="text-zinc-200 text-[10px] italic">"{selectedBookingForDetails.serviceRemarks}"</p>
                        </div>
                      )}
                      {selectedBookingForDetails.staffRemarks && (
                        <div className={`${(selectedBookingForDetails.guestRemarks || selectedBookingForDetails.serviceRemarks) ? 'border-t border-zinc-850 pt-1.5' : ''}`}>
                          <div className="text-[8px] text-zinc-500 uppercase tracking-wide">Staff Roster</div>
                          <p className="text-zinc-200 text-[10px] italic">"{selectedBookingForDetails.staffRemarks}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                  <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850/60 flex flex-col gap-2">
                    <div>
                      <span className="text-zinc-500 text-[10px]">Activities Roster:</span>
                      <div className="flex flex-col gap-1 mt-1 pl-1">
                        {selectedBookingForDetails.services.map((s, idx) => (
                          <div key={idx} className="flex justify-between text-[10px] text-zinc-300">
                            <span>&bull; {s.serviceName} (x{s.adults}A, {s.children}C)</span>
                            <span className="font-semibold text-zinc-400">₹{s.rate}</span>
                          </div>
                        ))}
                      </div>
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
                        {selectedBookingForDetails.customRefreshmentPrice !== undefined && selectedBookingForDetails.customRefreshmentPrice > 0 && (
                          <span className="text-[9px] text-zinc-400 block">&bull; Refreshments cost: ₹{selectedBookingForDetails.customRefreshmentPrice}</span>
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
                    {selectedBookingForDetails.extraCharges !== undefined && selectedBookingForDetails.extraCharges > 0 && (
                      <div className="flex justify-between text-zinc-400">
                        <span>Extra Charges (Isolated)</span>
                        <span className="text-amber-400 font-bold">₹{selectedBookingForDetails.extraCharges}</span>
                      </div>
                    )}
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
                    <div className="flex justify-between text-amber-500 font-semibold border-t border-zinc-855 pt-1 mt-0.5">
                      <span>Balance Due</span>
                      <span>₹{selectedBookingForDetails.balance}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400 border-t border-zinc-855 pt-1.5 mt-1">
                      <span>Agent Commission</span>
                      <span className="text-white font-medium">₹{selectedBookingForDetails.commission}</span>
                    </div>
                    <div className="flex justify-between text-sky-400 font-bold border-t border-zinc-855 pt-1 mt-0.5">
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
          <p className="text-[9px] text-zinc-655 opacity-40 hover:opacity-100 transition-opacity font-semibold">
            Pokkalo Kayaking Club &copy; {new Date().getFullYear()} &bull; Made by Alvin Ben George
          </p>
        </footer>

      </main>
    </div>
  );
}
