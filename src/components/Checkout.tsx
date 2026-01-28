import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, X, Copy, Check, Download, Eye } from 'lucide-react';
import { CartItem, PaymentMethod, CustomField, OrderStatus } from '../types';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useImageUpload } from '../hooks/useImageUpload';
import { useOrders } from '../hooks/useOrders';
import { useSiteSettings } from '../hooks/useSiteSettings';
import OrderStatusModal from './OrderStatusModal';

interface CheckoutProps {
  cartItems: CartItem[];
  totalPrice: number;
  onBack: () => void;
  onNavigateToMenu?: () => void; // Callback to navigate to menu (e.g., after order succeeded)
}

// Visible in DOM to confirm new checkout is loaded (dev)
const CHECKOUT_DATA_ATTR = { 'data-checkout-version': '2' };

const CHECKOUT_STORAGE_KEYS = {
  paymentMethodId: 'tarchier_checkout_paymentMethodId',
  customFieldValues: 'tarchier_checkout_customFieldValues',
  receiptImageUrl: 'tarchier_checkout_receiptImageUrl',
  receiptPreview: 'tarchier_checkout_receiptPreview',
  bulkInputValues: 'tarchier_checkout_bulkInputValues',
  bulkSelectedGames: 'tarchier_checkout_bulkSelectedGames',
};

const Checkout: React.FC<CheckoutProps> = ({ cartItems, totalPrice, onBack, onNavigateToMenu }) => {
  const { paymentMethods } = usePaymentMethods();
  const { uploadImage, uploading: uploadingReceipt } = useImageUpload();
  const { createOrder, fetchOrderById } = useOrders();
  const { siteSettings } = useSiteSettings();
  const orderOption = siteSettings?.order_option || 'order_via_messenger';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [, setShowScrollIndicator] = useState(true);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(CHECKOUT_STORAGE_KEYS.customFieldValues);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(() =>
    localStorage.getItem(CHECKOUT_STORAGE_KEYS.receiptImageUrl)
  );
  const [receiptPreview, setReceiptPreview] = useState<string | null>(() =>
    localStorage.getItem(CHECKOUT_STORAGE_KEYS.receiptPreview)
  );
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasCopiedMessage, setHasCopiedMessage] = useState(false);
  const [copiedAccountNumber, setCopiedAccountNumber] = useState(false);
  const [copiedAccountName, setCopiedAccountName] = useState(false);
  const [bulkInputValues, setBulkInputValues] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(CHECKOUT_STORAGE_KEYS.bulkInputValues);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [bulkSelectedGames, setBulkSelectedGames] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(CHECKOUT_STORAGE_KEYS.bulkSelectedGames);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [existingOrderStatus, setExistingOrderStatus] = useState<OrderStatus | null>(null);
  const [, setIsCheckingExistingOrder] = useState(true);

  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);

  // Restore saved payment method from localStorage (store object like repository)
  useEffect(() => {
    const savedId = localStorage.getItem(CHECKOUT_STORAGE_KEYS.paymentMethodId);
    if (savedId && paymentMethods.length > 0) {
      const method = paymentMethods.find(m => m.id === savedId);
      if (method) {
        if (method.max_order_amount != null && totalPrice >= method.max_order_amount) {
          localStorage.removeItem(CHECKOUT_STORAGE_KEYS.paymentMethodId);
        } else {
          setPaymentMethod(method);
        }
      }
    }
  }, [paymentMethods, totalPrice]);

  // Persist checkout state to localStorage
  useEffect(() => {
    localStorage.setItem(CHECKOUT_STORAGE_KEYS.customFieldValues, JSON.stringify(customFieldValues));
  }, [customFieldValues]);
  useEffect(() => {
    if (receiptImageUrl) localStorage.setItem(CHECKOUT_STORAGE_KEYS.receiptImageUrl, receiptImageUrl);
    else localStorage.removeItem(CHECKOUT_STORAGE_KEYS.receiptImageUrl);
  }, [receiptImageUrl]);
  useEffect(() => {
    if (receiptPreview) localStorage.setItem(CHECKOUT_STORAGE_KEYS.receiptPreview, receiptPreview);
    else localStorage.removeItem(CHECKOUT_STORAGE_KEYS.receiptPreview);
  }, [receiptPreview]);
  useEffect(() => {
    localStorage.setItem(CHECKOUT_STORAGE_KEYS.bulkInputValues, JSON.stringify(bulkInputValues));
  }, [bulkInputValues]);
  useEffect(() => {
    localStorage.setItem(CHECKOUT_STORAGE_KEYS.bulkSelectedGames, JSON.stringify(bulkSelectedGames));
  }, [bulkSelectedGames]);
  useEffect(() => {
    if (paymentMethod) localStorage.setItem(CHECKOUT_STORAGE_KEYS.paymentMethodId, paymentMethod.id);
    else localStorage.removeItem(CHECKOUT_STORAGE_KEYS.paymentMethodId);
  }, [paymentMethod]);

  // Show payment details modal when payment method is selected (repository behavior)
  useEffect(() => {
    if (paymentMethod) setShowPaymentDetailsModal(true);
  }, [paymentMethod]);

  // Extract original menu item ID from cart item ID (format: "menuItemId:::CART:::timestamp-random")
  // This allows us to group all packages from the same game together
  const getOriginalMenuItemId = (cartItemId: string): string => {
    const parts = cartItemId.split(':::CART:::');
    return parts.length > 1 ? parts[0] : cartItemId;
  };

  // Group custom fields by item/game
  // If any game has custom fields, show those grouped by game. Otherwise, show default "IGN" field
  // Deduplicate by original menu item ID to avoid showing the same fields multiple times for the same game
  // (even if different packages/variations are selected)
  const itemsWithCustomFields = useMemo(() => {
    const itemsWithFields = cartItems.filter(item => item.customFields && item.customFields.length > 0);
    // Deduplicate by original menu item ID
    const uniqueItems = new Map<string, typeof cartItems[0]>();
    itemsWithFields.forEach(item => {
      const originalId = getOriginalMenuItemId(item.id);
      if (!uniqueItems.has(originalId)) {
        uniqueItems.set(originalId, item);
      }
    });
    return Array.from(uniqueItems.values());
  }, [cartItems]);

  const hasAnyCustomFields = itemsWithCustomFields.length > 0;

  // Get bulk input fields based on selected games - position-based
  // If selected games have N fields, show N bulk input fields
  const bulkInputFields = useMemo(() => {
    if (bulkSelectedGames.length === 0) return [];
    
    // Get all selected items (bulkSelectedGames contains original menu item IDs)
    const selectedItems = itemsWithCustomFields.filter(item => 
      bulkSelectedGames.includes(getOriginalMenuItemId(item.id))
    );
    
    if (selectedItems.length === 0) return [];
    
    // Find the maximum number of fields across all selected games
    const maxFields = Math.max(...selectedItems.map(item => item.customFields?.length || 0));
    
    if (maxFields === 0) return [];
    
    // Create fields array based on position (index)
    // Use the first selected item's fields as reference for labels
    const referenceItem = selectedItems[0];
    const fields: Array<{ index: number, field: CustomField | null }> = [];
    
    for (let i = 0; i < maxFields; i++) {
      // Try to get field from reference item, or use a placeholder
      const field = referenceItem.customFields?.[i] || null;
      fields.push({ index: i, field });
    }
    
    return fields;
  }, [bulkSelectedGames, itemsWithCustomFields]);

  // Sync bulk input values to selected games by position
  React.useEffect(() => {
    if (bulkSelectedGames.length === 0) return;
    
    const updates: Record<string, string> = {};
    
    // Get selected items (bulkSelectedGames contains original menu item IDs)
    const selectedItems = itemsWithCustomFields.filter(item => 
      bulkSelectedGames.includes(getOriginalMenuItemId(item.id))
    );
    
    // For each bulk input field (by index)
    Object.entries(bulkInputValues).forEach(([fieldIndexStr, value]) => {
      const fieldIndex = parseInt(fieldIndexStr, 10);
      
      // Apply to all selected games at the same field position
      selectedItems.forEach((item) => {
        if (item.customFields && item.customFields[fieldIndex]) {
          const field = item.customFields[fieldIndex];
          const originalId = getOriginalMenuItemId(item.id);
          // Find the actual itemIndex from itemsWithCustomFields
          const actualItemIndex = itemsWithCustomFields.findIndex(i => getOriginalMenuItemId(i.id) === originalId);
          if (actualItemIndex !== -1) {
            // Use fieldIndex to ensure uniqueness even if field.key is duplicated
            const valueKey = `${originalId}_${fieldIndex}_${field.key}`;
            updates[valueKey] = value;
          }
        }
      });
    });
    
    if (Object.keys(updates).length > 0) {
      setCustomFieldValues(prev => ({ ...prev, ...updates }));
    }
  }, [bulkInputValues, bulkSelectedGames, itemsWithCustomFields]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Check if buttons section is visible to hide scroll indicator
  React.useEffect(() => {
    if (!buttonsRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If buttons are visible, hide the scroll indicator
          if (entry.isIntersecting) {
            setShowScrollIndicator(false);
          } else {
            setShowScrollIndicator(true);
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% of the element is visible
        rootMargin: '-50px 0px' // Add some margin to trigger earlier
      }
    );

    observer.observe(buttonsRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const selectedPaymentMethod = paymentMethod;
  
  const handleBulkInputChange = (fieldKey: string, value: string) => {
    setBulkInputValues(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleBulkGameSelectionChange = (itemId: string, checked: boolean) => {
    // itemId is the cart item ID, convert to original menu item ID
    const originalId = getOriginalMenuItemId(itemId);
    if (checked) {
      setBulkSelectedGames(prev => [...prev, originalId]);
    } else {
      setBulkSelectedGames(prev => prev.filter(id => id !== originalId));
    }
  };

  // Single-page layout - no step navigation

  const handleReceiptUpload = async (file: File) => {
    try {
      setReceiptError(null);
      setReceiptFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase
      const url = await uploadImage(file, 'payment-receipts');
      setReceiptImageUrl(url);
    } catch (error) {
      console.error('Error uploading receipt:', error);
      setReceiptError(error instanceof Error ? error.message : 'Failed to upload receipt');
      setReceiptFile(null);
      setReceiptPreview(null);
    }
  };

  const handleReceiptRemove = () => {
    setReceiptFile(null);
    setReceiptImageUrl(null);
    setReceiptPreview(null);
    setReceiptError(null);
    setHasCopiedMessage(false); // Reset copy state when receipt is removed
  };

  // Generate the order message text
  const generateOrderMessage = (): string => {
    // Build custom fields section grouped by game
    let customFieldsSection = '';
    if (hasAnyCustomFields) {
      // Group games by their field VALUES only (not labels) to handle bulk input
      // This groups games that have the same values even if field labels differ
      const gamesByFieldValues = new Map<string, { 
        games: Array<{ name: string, labels: string[] }>, 
        fieldValues: string[] 
      }>();
      
      itemsWithCustomFields.forEach(item => {
        // Get all field values for this game (use original menu item ID)
        const originalId = getOriginalMenuItemId(item.id);
        const fieldValues: string[] = [];
        const fieldLabels: string[] = [];
        
        item.customFields?.forEach((field, fieldIndex) => {
          const valueKey = `${originalId}_${fieldIndex}_${field.key}`;
          const value = customFieldValues[valueKey] || '';
          if (value) {
            fieldValues.push(value);
            fieldLabels.push(field.label);
          }
        });
        
        if (fieldValues.length === 0) return;
        
        // Create a key based on field VALUES only (not labels) to group by bulk input
        const valueKey = fieldValues.join('|');
        
        if (!gamesByFieldValues.has(valueKey)) {
          gamesByFieldValues.set(valueKey, { games: [], fieldValues });
        }
        gamesByFieldValues.get(valueKey)!.games.push({ name: item.name, labels: fieldLabels });
      });
      
      // Build the section
      const sections: string[] = [];
      gamesByFieldValues.forEach(({ games, fieldValues }) => {
        if (games.length === 0 || fieldValues.length === 0) return;
        
        // Add all game names first (one per line)
        games.forEach(game => {
          sections.push(game.name);
        });
        
        // Show fields with labels from the first game in the group
        // Since values are the same (bulk input), we only show once
        const firstGame = games[0];
        firstGame.labels.forEach((label, index) => {
          if (fieldValues[index]) {
            sections.push(`${label}: ${fieldValues[index]}`);
          }
        });
      });
      
      if (sections.length > 0) {
        customFieldsSection = sections.join('\n');
      }
    } else {
      customFieldsSection = `IGN: ${customFieldValues['default_ign'] || ''}`;
    }

    const orderDetails = `
${customFieldsSection}

ORDER DETAILS:
${cartItems.map(item => {
  let itemDetails = `• ${item.name}`;
  if (item.selectedVariation) {
    itemDetails += ` (${item.selectedVariation.name})`;
  }
  itemDetails += ` x${item.quantity} - ₱${item.totalPrice * item.quantity}`;
  return itemDetails;
}).join('\n')}

TOTAL: ₱${totalPrice}

Payment: ${selectedPaymentMethod?.name || ''}
    `.trim();

    return orderDetails;
  };

  const handleCopyMessage = async () => {
    try {
      const message = generateOrderMessage();
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setHasCopiedMessage(true); // Mark that copy button has been clicked
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleCopyAccountNumber = async (accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedAccountNumber(true);
      setTimeout(() => setCopiedAccountNumber(false), 2000);
    } catch (error) {
      console.error('Failed to copy account number:', error);
    }
  };

  const handleCopyAccountName = async (accountName: string) => {
    try {
      await navigator.clipboard.writeText(accountName);
      setCopiedAccountName(true);
      setTimeout(() => setCopiedAccountName(false), 2000);
    } catch (error) {
      console.error('Failed to copy account name:', error);
    }
  };

  // Detect if we're in Messenger's in-app browser
  const isMessengerBrowser = useMemo(() => {
    return /FBAN|FBAV/i.test(navigator.userAgent) || 
           /FB_IAB/i.test(navigator.userAgent);
  }, []);

  const handleDownloadQRCode = async (qrCodeUrl: string, paymentMethodName: string) => {
    // Only disable in Messenger's in-app browser
    // All external browsers (Chrome, Safari, Firefox, Edge, etc.) should work
    if (isMessengerBrowser) {
      // In Messenger, downloads don't work - users can long-press the QR code image
      return;
    }
    
    // For all external browsers, fetch and download as blob to force download
    // This approach works in Chrome, Safari, Firefox, Edge, Opera, and other modern browsers
    try {
      const response = await fetch(qrCodeUrl, {
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${paymentMethodName.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.style.display = 'none';
      
      // Append to body, click, then remove
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: try direct link with download attribute
      // This works in most browsers but may open instead of download in some cases
      try {
        const link = document.createElement('a');
        link.href = qrCodeUrl;
        link.download = `qr-code-${paymentMethodName.toLowerCase().replace(/\s+/g, '-')}.png`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      } catch (fallbackError) {
        console.error('Fallback download also failed:', fallbackError);
      }
    }
  };

  // Check for existing order on mount
  useEffect(() => {
    const checkExistingOrder = async () => {
      const storedOrderId = localStorage.getItem('current_order_id');
      if (storedOrderId) {
        const order = await fetchOrderById(storedOrderId);
        if (order) {
          setExistingOrderStatus(order.status);
          setOrderId(order.id);
          
          // Clear localStorage only if order is approved (succeeded)
          // Keep rejected orders so user can still view them
          if (order.status === 'approved') {
            localStorage.removeItem('current_order_id');
            setExistingOrderStatus(null);
            setOrderId(null);
          }
        } else {
          localStorage.removeItem('current_order_id');
        }
      }
      setIsCheckingExistingOrder(false);
    };

    checkExistingOrder();
  }, [fetchOrderById]);

  const handlePlaceOrder = () => {
    if (!paymentMethod) {
      setReceiptError('Please select a payment method');
      return;
    }

    const orderDetails = generateOrderMessage();
    const encodedMessage = encodeURIComponent(orderDetails);
    const messengerUrl = `https://m.me/Rnold77?text=${encodedMessage}`;
    
    window.open(messengerUrl, '_blank');
  };

  const handlePlaceOrderDirect = async () => {
    if (!paymentMethod) {
      setReceiptError('Please select a payment method');
      return;
    }

    if (!selectedPaymentMethod) {
      setReceiptError('Please select a payment method');
      return;
    }

    try {
      setIsPlacingOrder(true);
      setReceiptError(null);

      // Build customer info object
      const customerInfo: Record<string, string | unknown> = {};
      
      // Add payment method
      customerInfo['Payment Method'] = selectedPaymentMethod.name;

      // Single account mode (default)
      // Add custom fields
      if (hasAnyCustomFields) {
        itemsWithCustomFields.forEach((item) => {
          const originalId = getOriginalMenuItemId(item.id);
          item.customFields?.forEach((field, fieldIndex) => {
            // Use fieldIndex to ensure uniqueness even if field.key is duplicated
            const valueKey = `${originalId}_${fieldIndex}_${field.key}`;
            const value = customFieldValues[valueKey];
            if (value) {
              customerInfo[field.label] = value;
            }
          });
        });
      } else {
        // Default IGN field
        if (customFieldValues['default_ign']) {
          customerInfo['IGN'] = customFieldValues['default_ign'];
        }
      }

      // Create order
      const newOrder = await createOrder({
        order_items: cartItems,
        customer_info: customerInfo as Record<string, string | unknown>,
        payment_method_id: selectedPaymentMethod.id,
        receipt_url: '',
        total_price: totalPrice,
      });

      if (newOrder) {
        setOrderId(newOrder.id);
        setExistingOrderStatus(newOrder.status);
        localStorage.setItem('current_order_id', newOrder.id);
        setIsOrderModalOpen(true);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setReceiptError('Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const isDetailsValid = useMemo(() => {
    if (!hasAnyCustomFields) {
      // Default IGN field
      return customFieldValues['default_ign']?.trim() || false;
    }
    
    // Check all required fields for all items (use original menu item ID)
    return itemsWithCustomFields.every(item => {
      if (!item.customFields) return true;
      const originalId = getOriginalMenuItemId(item.id);
      return item.customFields.every((field, fieldIndex) => {
        if (!field.required) return true;
        // Use fieldIndex to ensure uniqueness even if field.key is duplicated
        const valueKey = `${originalId}_${fieldIndex}_${field.key}`;
        return customFieldValues[valueKey]?.trim() || false;
      });
    });
  }, [hasAnyCustomFields, itemsWithCustomFields, customFieldValues]);

  const renderOrderStatusModal = () => (
    <OrderStatusModal
      orderId={orderId}
      isOpen={isOrderModalOpen}
      onClose={() => {
        setIsOrderModalOpen(false);
        // Check order status when modal closes
        if (orderId) {
          fetchOrderById(orderId).then(order => {
            if (order) {
              setExistingOrderStatus(order.status);
              if (order.status === 'approved') {
                // Clear localStorage and state only for approved orders
                localStorage.removeItem('current_order_id');
                setExistingOrderStatus(null);
                setOrderId(null);
              }
              // For rejected orders, keep the IDs and localStorage so user can still view the order details
              // and the "Order Again" button will show
            }
          });
        }
      }}
      onSucceededClose={() => {
        localStorage.removeItem('current_order_id');
        setExistingOrderStatus(null);
        setOrderId(null);
        if (onNavigateToMenu) {
          onNavigateToMenu();
        }
      }}
    />
  );

  const StepNumber: React.FC<{ n: number }> = ({ n }) => (
    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: '#145885' }}>{n}</span>
  );

  return (
    <>
      <div className="max-w-2xl mx-auto px-3 py-4 pb-20" {...CHECKOUT_DATA_ATTR}>
        <div className="flex items-center mb-4">
          <button
            onClick={onBack}
            className="flex items-center text-cafe-textMuted hover:text-cafe-primary transition-colors duration-200 p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-semibold text-cafe-text text-center flex-1">Top Up</h1>
          <div className="w-6" />
        </div>

        {/* Section 1: Customer Information */}
        <section className="pb-4 mb-4 border-b border-cafe-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <StepNumber n={1} />
            <h2 className="text-xs font-semibold text-cafe-text">Customer Information</h2>
          </div>
            
            <form className="space-y-4">
              {/* Bulk Input Section */}
              {itemsWithCustomFields.length >= 2 && (
                <div className="mb-4 p-3 glass-strong border border-cafe-primary/30 rounded-lg">
                  <h3 className="text-sm font-semibold text-cafe-text mb-2">Bulk Input</h3>
                  <p className="text-[11px] text-cafe-textMuted mb-2">
                    Select games and fill fields once for all selected games.
                  </p>
                  
                  {/* Game Selection Checkboxes */}
                  <div className="space-y-1.5 mb-2">
                    {itemsWithCustomFields.map((item) => {
                      const originalId = getOriginalMenuItemId(item.id);
                      const isSelected = bulkSelectedGames.includes(originalId);
                      return (
                        <label
                          key={item.id}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleBulkGameSelectionChange(item.id, e.target.checked)}
                            className="w-3.5 h-3.5 text-cafe-primary border-cafe-primary/30 rounded focus:ring-cafe-primary"
                          />
                          {item.image ? (
                            <img
                              src={item.image}
                              alt=""
                              className="w-6 h-6 rounded object-cover flex-shrink-0"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <span className="w-6 h-6 rounded bg-cafe-primary/20 flex items-center justify-center text-xs flex-shrink-0">🎮</span>
                          )}
                          <span className="text-xs text-cafe-text">{item.name}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Input Fields - Only show if games are selected */}
                  {bulkSelectedGames.length > 0 && bulkInputFields.length > 0 && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-cafe-primary/20">
                      {bulkInputFields.map(({ index, field }) => (
                        <div key={index}>
                          <label className="block text-[11px] font-medium text-cafe-text mb-1">
                            {field ? field.label : `Field ${index + 1}`} <span className="text-cafe-textMuted">(Bulk)</span> {field?.required && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={bulkInputValues[index.toString()] || ''}
                            onChange={(e) => handleBulkInputChange(index.toString(), e.target.value)}
                            className="w-full px-3 py-2 text-xs glass border border-cafe-primary/30 rounded-lg focus:ring-2 focus:ring-cafe-primary focus:border-cafe-primary transition-all duration-200 text-cafe-text placeholder-cafe-textMuted"
                            placeholder={field?.placeholder || field?.label || `Field ${index + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Custom Fields grouped by game */}
              {hasAnyCustomFields ? (
                itemsWithCustomFields.map((item, itemIndex) => (
                  <div key={item.id} className="space-y-3 pb-4 border-b border-cafe-primary/20 last:border-b-0 last:pb-0">
                    <div className="mb-2 flex items-center gap-2">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="w-8 h-8 rounded-lg bg-cafe-primary/20 flex items-center justify-center text-sm flex-shrink-0">🎮</span>
                      )}
                      <div>
                        <h3 className="text-xs font-semibold text-cafe-text">{item.name}</h3>
                        <p className="text-[11px] text-cafe-textMuted">Please provide the following information for this game</p>
                      </div>
                    </div>
                    {item.customFields?.map((field, fieldIndex) => {
                      const originalId = getOriginalMenuItemId(item.id);
                      // Use fieldIndex to ensure uniqueness even if field.key is duplicated within the same game
                      const valueKey = `${originalId}_${fieldIndex}_${field.key}`;
                      const inputId = `input-${originalId}-${itemIndex}-${fieldIndex}-${field.key}`;
                      return (
                        <div key={`${item.id}-${fieldIndex}-${field.key}`}>
                          <label htmlFor={inputId} className="block text-[11px] font-medium text-cafe-text mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            id={inputId}
                            type="text"
                            name={valueKey}
                            autoComplete="off"
                            value={customFieldValues[valueKey] || ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setCustomFieldValues(prev => ({
                                ...prev,
                                [valueKey]: newValue
                              }));
                            }}
                            className="w-full px-3 py-2 text-xs glass border border-cafe-primary/30 rounded-lg focus:ring-2 focus:ring-cafe-primary focus:border-cafe-primary transition-all duration-200 text-cafe-text placeholder-cafe-textMuted"
                            placeholder={field.placeholder || field.label}
                            required={field.required}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div>
                  <label className="block text-[11px] font-medium text-cafe-text mb-1">
                    IGN <span className="text-red-500">*</span>
                  </label>
                    <input
                      id="default-ign-input"
                      type="text"
                      name="default_ign"
                      autoComplete="off"
                      value={customFieldValues['default_ign'] || ''}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setCustomFieldValues(prev => ({
                          ...prev,
                          ['default_ign']: newValue
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs glass border border-cafe-primary/30 rounded-lg focus:ring-2 focus:ring-cafe-primary focus:border-cafe-primary transition-all duration-200 text-cafe-text placeholder-cafe-textMuted"
                      placeholder="In game name"
                      required
                    />
                </div>
              )}

            </form>
        </section>

        {/* Section 2: Choose Payment Method */}
        <section className="pb-4 mb-4 border-b border-cafe-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <StepNumber n={2} />
            <h2 className="text-xs font-semibold text-cafe-text">Choose Payment Method</h2>
          </div>
          
          <div className="grid grid-cols-6 gap-2 mb-4">
            {paymentMethods
              .filter((method) => {
                if (method.max_order_amount != null && method.max_order_amount !== undefined)
                  return totalPrice < method.max_order_amount;
                return true;
              })
              .map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method);
                    setShowPaymentDetailsModal(true);
                  }}
                  className={`aspect-square w-full rounded-xl border-2 transition-all duration-200 flex items-center justify-center overflow-hidden ${
                    selectedPaymentMethod?.id === method.id
                      ? 'border-cafe-primary ring-2 ring-cafe-primary/50'
                      : 'glass border-cafe-primary/30 text-cafe-text hover:border-cafe-primary hover:glass-strong'
                  }`}
                  style={selectedPaymentMethod?.id === method.id ? { backgroundColor: '#145885' } : {}}
                >
                  {method.icon_url ? (
                    <img src={method.icon_url} alt={method.name} className="w-full h-full object-contain p-1" title={method.name} />
                  ) : (
                    <span className="text-2xl" title={method.name}>💳</span>
                  )}
                </button>
              ))}
          </div>

          <div
            className="rounded-xl p-4 border-2"
            style={{
              backgroundColor: '#145885',
              borderColor: 'rgba(20, 88, 133, 0.6)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.1) inset',
            }}
          >
            <p className="text-[11px] font-semibold mb-1.5" style={{ color: '#7eb8e0' }}>
              Please read
            </p>
            <p className="text-[11px] text-white leading-relaxed">
              Pay using any of the methods above → screenshot the receipt → then send to our Messenger after submitting your order.
            </p>
          </div>
        </section>

        {/* Section 3 & 4: Place Order */}
        <section className="pb-4">
          <div ref={buttonsRef}>
            {orderOption === 'order_via_messenger' ? (
              <>
                <button
                  onClick={handleCopyMessage}
                  disabled={!paymentMethod}
                  className={`w-full py-2.5 rounded-lg font-medium text-xs transition-all duration-200 transform mb-2 flex items-center ${
                    paymentMethod
                      ? 'glass border border-cafe-primary/30 text-cafe-text hover:border-cafe-primary hover:glass-strong'
                      : 'glass border border-cafe-primary/20 text-cafe-textMuted cursor-not-allowed'
                  }`}
                >
                  <StepNumber n={3} />
                  <span className="flex-1 flex items-center justify-center gap-2">
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy Order Message</span>
                      </>
                    )}
                  </span>
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={!paymentMethod || !hasCopiedMessage}
                  className={`w-full py-2.5 rounded-lg font-semibold text-xs transition-all duration-200 transform flex items-center uppercase tracking-wide ${
                    paymentMethod && hasCopiedMessage
                      ? 'text-white hover:opacity-90 hover:scale-[1.02]'
                      : 'glass text-cafe-textMuted cursor-not-allowed'
                  }`}
                  style={paymentMethod && hasCopiedMessage ? { backgroundColor: '#145885' } : {}}
                >
                  <StepNumber n={4} />
                  <span className="flex-1 flex justify-center">Submit Order</span>
                </button>
                <p className="text-[11px] text-cafe-textMuted text-center mt-2">
                  You'll be redirected to Facebook Messenger to confirm your order.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <StepNumber n={3} />
                  <h2 className="text-xs font-semibold text-cafe-text">Place Order</h2>
                </div>
                {existingOrderStatus && existingOrderStatus !== 'approved' && existingOrderStatus !== 'rejected' && (
                  <button
                    onClick={() => setIsOrderModalOpen(true)}
                    className="w-full py-3 rounded-lg font-medium text-xs transition-all duration-200 transform text-white hover:opacity-90 hover:scale-[1.02] flex items-center justify-center gap-2 mb-2"
                    style={{ backgroundColor: '#145885' }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Order
                  </button>
                )}
                {(!existingOrderStatus || existingOrderStatus === 'rejected') && (
                  <button
                    onClick={handlePlaceOrderDirect}
                    disabled={!paymentMethod || isPlacingOrder}
                    className={`w-full py-3 rounded-lg font-medium text-xs transition-all duration-200 transform ${
                      paymentMethod && !isPlacingOrder
                        ? 'text-white hover:opacity-90 hover:scale-[1.02]'
                        : 'glass text-cafe-textMuted cursor-not-allowed'
                    }`}
                    style={paymentMethod && !isPlacingOrder ? { backgroundColor: '#145885' } : {}}
                  >
                    {isPlacingOrder ? 'Placing Order...' : existingOrderStatus === 'rejected' ? 'Order Again' : 'Place Order'}
                  </button>
                )}
                <p className="text-[11px] text-cafe-textMuted text-center mt-2">
                  Your order will be processed directly. You can track its status after placing the order.
                </p>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Payment Details Modal - repository layout */}
      {showPaymentDetailsModal && selectedPaymentMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50" onClick={() => setShowPaymentDetailsModal(false)}>
          <div className="bg-cafe-darkCard rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-cafe-primary/30" onClick={(e) => e.stopPropagation()}>
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold text-cafe-text">Payment Details</h3>
                <button
                  type="button"
                  onClick={() => setShowPaymentDetailsModal(false)}
                  className="p-1.5 glass-strong rounded-lg hover:bg-cafe-primary/20 transition-colors duration-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 text-cafe-text" />
                </button>
              </div>
              <p className="text-xs text-cafe-textMuted mb-3">
                Press the copy button to copy the number or download the QR code, make a payment, then proceed to place your order.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-semibold text-cafe-text">{selectedPaymentMethod.name}</p>
                  <p className="text-lg font-semibold text-cafe-text">₱{totalPrice}</p>
                </div>
                <div className="flex flex-wrap gap-4 gap-y-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-xs text-cafe-textMuted">Number:</p>
                      <button
                        type="button"
                        onClick={() => handleCopyAccountNumber(selectedPaymentMethod.account_number)}
                        className="p-1 glass-strong rounded-lg hover:bg-cafe-primary/20 transition-colors duration-200 flex-shrink-0"
                        title="Copy account number"
                      >
                        {copiedAccountNumber ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-cafe-text" />}
                      </button>
                    </div>
                    <p className="font-mono text-cafe-text font-medium text-sm break-all">{selectedPaymentMethod.account_number}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-xs text-cafe-textMuted">Name:</p>
                      <button
                        type="button"
                        onClick={() => handleCopyAccountName(selectedPaymentMethod.account_name)}
                        className="p-1 glass-strong rounded-lg hover:bg-cafe-primary/20 transition-colors duration-200 flex-shrink-0"
                        title="Copy account name"
                      >
                        {copiedAccountName ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-cafe-text" />}
                      </button>
                    </div>
                    <p className="font-mono text-cafe-text font-medium text-sm break-words">{selectedPaymentMethod.account_name}</p>
                  </div>
                </div>
                <p className="font-medium text-sm text-cafe-text text-center">Other Option</p>
                {selectedPaymentMethod.qr_code_url ? (
                  <div className="flex flex-col items-center gap-1.5">
                    {!isMessengerBrowser && (
                      <button
                        type="button"
                        onClick={() => handleDownloadQRCode(selectedPaymentMethod.qr_code_url, selectedPaymentMethod.name)}
                        className="px-2 py-1 glass-strong rounded-lg hover:bg-cafe-primary/20 transition-colors duration-200 text-xs font-medium text-cafe-text flex items-center gap-1.5"
                        title="Download QR code"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download QR
                      </button>
                    )}
                    {isMessengerBrowser && (
                      <p className="text-[11px] text-cafe-textMuted text-center">Long-press the QR code to save</p>
                    )}
                    <img
                      src={selectedPaymentMethod.qr_code_url}
                      alt={`${selectedPaymentMethod.name} QR Code`}
                      className="w-28 h-28 rounded-lg border-2 border-cafe-primary/30"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-cafe-textMuted text-center py-3">No QR Code Available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {renderOrderStatusModal()}
    </>
  );
};

export default Checkout;