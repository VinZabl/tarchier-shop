import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useCart } from './hooks/useCart';
import Header from './components/Header';
import SubNav from './components/SubNav';
import Menu from './components/Menu';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import FloatingSupportButton from './components/FloatingSupportButton';
import Footer from './components/Footer';
import AdminDashboard from './components/AdminDashboard';
import { useMenu } from './hooks/useMenu';
import { useSiteSettings } from './hooks/useSiteSettings';

const CUSTOMER_VIEW_STORAGE_KEY = 'tarchier_customer_view';

function loadCustomerView(): 'menu' | 'cart' | 'checkout' {
  try {
    const v = localStorage.getItem(CUSTOMER_VIEW_STORAGE_KEY);
    if (v === 'menu' || v === 'cart' || v === 'checkout') return v;
  } catch {}
  return 'menu';
}

function MainApp() {
  const cart = useCart();
  const { menuItems } = useMenu();
  const { siteSettings } = useSiteSettings();
  const [currentView, setCurrentView] = React.useState<'menu' | 'cart' | 'checkout'>(loadCustomerView);
  const [selectedCategory, setSelectedCategory] = React.useState<string>(() => {
    try {
      const v = localStorage.getItem('tarchier_menu_category');
      return v ?? 'all';
    } catch { return 'all'; }
  });
  const [searchQuery, setSearchQuery] = React.useState<string>(() => {
    try {
      const v = localStorage.getItem('tarchier_menu_search');
      return v ?? '';
    } catch { return ''; }
  });

  React.useEffect(() => {
    localStorage.setItem('tarchier_menu_category', selectedCategory);
  }, [selectedCategory]);
  React.useEffect(() => {
    localStorage.setItem('tarchier_menu_search', searchQuery);
  }, [searchQuery]);

  // Persist current view so customer returns to same place after refresh or revisit
  React.useEffect(() => {
    localStorage.setItem(CUSTOMER_VIEW_STORAGE_KEY, currentView);
  }, [currentView]);

  // If we restored checkout or cart but cart is empty, go back to menu
  React.useEffect(() => {
    if ((currentView === 'checkout' || currentView === 'cart') && cart.cartItems.length === 0) {
      setCurrentView('menu');
    }
  }, [currentView, cart.cartItems.length]);

  // Update document title based on site settings
  React.useEffect(() => {
    const siteName = siteSettings?.site_name || 'Tarchier Discounted Shop';
    document.title = siteName;
  }, [siteSettings]);

  const handleViewChange = React.useCallback((view: 'menu' | 'cart' | 'checkout') => {
    setCurrentView(view);
  }, []);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Clear search when changing category
    setSearchQuery('');
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    // If searching, set category to 'all' to show all results
    if (query.trim() !== '') {
      setSelectedCategory('all');
    }
  };

  // Handler for when item is added from package selection modal
  const handleItemAdded = React.useCallback(() => {
    localStorage.setItem('tarchier_skipScrollRestore', 'true');
    setCurrentView('cart');
  }, []);

  // Check if there are any popular items
  const hasPopularItems = React.useMemo(() => {
    return menuItems.some(item => Boolean(item.popular) === true);
  }, [menuItems]);

  // If user is on popular category but there are no popular items, redirect to 'all'
  React.useEffect(() => {
    if (selectedCategory === 'popular' && !hasPopularItems && menuItems.length > 0) {
      setSelectedCategory('all');
    }
  }, [hasPopularItems, selectedCategory, menuItems.length]);

  // Filter menu items based on selected category and search query
  const filteredMenuItems = React.useMemo(() => {
    let filtered = menuItems;

    // First filter by category
    if (selectedCategory === 'popular') {
      filtered = filtered.filter(item => Boolean(item.popular) === true);
    } else if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Then filter by search query if present
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [menuItems, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Background logo with 20% opacity - appears on all customer pages */}
      <div 
        className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
        style={{
          backgroundImage: 'url(/logo.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          opacity: 0.2
        }}
      />
      
      <Header 
        cartItemsCount={cart.getTotalItems()}
        onCartClick={() => handleViewChange('cart')}
        onMenuClick={() => handleViewChange('menu')}
      />
      {currentView === 'menu' && (
        <SubNav 
          selectedCategory={selectedCategory} 
          onCategoryClick={handleCategoryClick}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          hasPopularItems={hasPopularItems}
        />
      )}
      
      {currentView === 'menu' && (
        <Menu 
          menuItems={filteredMenuItems}
          addToCart={cart.addToCart}
          cartItems={cart.cartItems}
          updateQuantity={cart.updateQuantity}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          onItemAdded={handleItemAdded}
        />
      )}
      
      {currentView === 'cart' && (
        <Cart 
          cartItems={cart.cartItems}
          updateQuantity={cart.updateQuantity}
          removeFromCart={cart.removeFromCart}
          clearCart={cart.clearCart}
          getTotalPrice={cart.getTotalPrice}
          onContinueShopping={() => handleViewChange('menu')}
          onCheckout={() => handleViewChange('checkout')}
        />
      )}
      
      {currentView === 'checkout' && (
        <Checkout 
          cartItems={cart.cartItems}
          totalPrice={cart.getTotalPrice()}
          onBack={() => handleViewChange('cart')}
          onNavigateToMenu={() => {
            cart.clearCart();
            handleViewChange('menu');
          }}
        />
      )}
      
      <FloatingSupportButton />
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;