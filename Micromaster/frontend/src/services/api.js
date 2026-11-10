import axios from 'axios';

// Comunicacion de peticiones: URL base que conecta el cliente React con las rutas de Laravel (igual que URL_SERVER_API en ClienteAdminSena)
const URL_SERVER_API = '/api';

const api = axios.create({
  baseURL: URL_SERVER_API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Control de registro y roles: antes de enviar cualquier peticion a la ruta, adjunta el token Sanctum guardado al iniciar sesion
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('micromaster_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Control de registro y roles: si el backend responde 401 (token vencido o no autorizado), limpia la sesion y redirige al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('micromaster_token');
      localStorage.removeItem('micromaster_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Comunicacion de peticiones: funcion auxiliar para consultar una ruta del backend y obtener directamente el JSON (igual que fetchDataFromApi en ClienteAdminSena)
export async function fetchDataFromApi(endpoint, params = {}) {
  const response = await api.get(endpoint, { params });
  return response.data ?? [];
}

// Control de registro y roles: peticiones para iniciar sesion, registrar usuarios nuevos, consultar sesion activa y cerrar sesion
export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Comunicacion de peticiones (Dashboard): pide al backend los indicadores principales y recibe el JSON de respuesta
export const dashboard = {
  index: () => api.get('/dashboard'),
  getKpis: () => api.get('/dashboard'),
};

// Llenado de CRUDs (Pedidos - orders): organizado en el mismo orden index, store, show, update y destroy de adminSena
export const orders = {
  index: (params) => api.get('/orders', { params }),
  store: (data) => api.post('/orders', data),
  show: (id) => api.get(`/orders/${id}`),
  update: (id, data) => api.patch(`/orders/${id}`, data),
  destroy: (id) => api.delete(`/orders/${id}`),

  list: (params) => api.get('/orders', { params }),
  create: (data) => api.post('/orders', data),
  get: (id) => api.get(`/orders/${id}`),
  remove: (id) => api.delete(`/orders/${id}`),
  bulkRelease: (data) => api.post('/orders/bulk-release', data),
  simulateIntake: () => api.post('/orders/simulate-intake'),
};

// Llenado de CRUDs (Recetas y Produccion - cost): peticiones a las rutas de recetas, insumos, tandas y mermas que devuelven JSON
export const cost = {
  index: () => api.get('/cost/recipes'),
  store: (data) => api.post('/cost/recipes', data),
  show: (recipeId) => api.get(`/cost/recipes/${recipeId}/stock-check`),
  update: (id, data) => api.patch(`/cost/recipes/${id}`, data),
  destroy: (id) => api.delete(`/cost/recipes/${id}`),

  getRecipes: () => api.get('/cost/recipes'),
  getStockCheck: (recipeId) => api.get(`/cost/recipes/${recipeId}/stock-check`),
  createRecipe: (data) => api.post('/cost/recipes', data),
  updateRecipe: (id, data) => api.patch(`/cost/recipes/${id}`, data),
  deleteRecipe: (id) => api.delete(`/cost/recipes/${id}`),
  simulateScale: (data) => api.post('/cost/simulate-scale', data),
  getIngredients: () => api.get('/cost/ingredients'),
  getProductionOrders: (params) => api.get('/cost/production-orders', { params }),
  createProductionOrder: (data) => api.post('/cost/production-orders', data),
  getProductionOrder: (id) => api.get(`/cost/production-orders/${id}`),
  closeProductionOrder: (id, data) => api.post(`/cost/production-orders/${id}/close`, data),
  getFloorWastes: () => api.get('/cost/floor-waste'),
  storeFloorWaste: (data) => api.post('/cost/floor-waste', data),
};

// Llenado de CRUDs (Inventario y Lotes - stock): consulta de lotes FEFO, registro de entradas, cruce de ordenes de compra y salidas
export const stock = {
  index: (params) => api.get('/stock/batches', { params }),
  store: (data) => api.post('/stock/batches', data),
  show: (code) => api.get(`/stock/purchase-orders/${code}`),
  update: (id, data) => api.patch(`/stock/batches/${id}/block`, data),

  getInventorySummary: () => api.get('/inventory/summary'),
  getBatches: (params) => api.get('/stock/batches', { params }),
  createBatch: (data) => api.post('/stock/batches', data),
  blockBatch: (id, data) => api.patch(`/stock/batches/${id}/block`, data),
  getPurchaseOrders: () => api.get('/stock/purchase-orders'),
  getPurchaseOrder: (code) => api.get(`/stock/purchase-orders/${code}`),
  receptionMatch: (data) => api.post('/stock/reception-match', data),
  getAlerts: () => api.get('/stock/alerts'),
  getIngredientStock: () => api.get('/stock/ingredients'),
  createEntry: (data) => api.post('/stock/entry', data),
  createExit: (data) => api.post('/stock/exit', data),
  getMovements: (params) => api.get('/stock/movements', { params }),
  qrScan: (data) => api.post('/stock/qr-scan', data),
};

// Llenado de CRUDs (Rutas y Entregas - delivery): consulta, creacion y actualizacion de rutas de despacho, conductores y novedades
export const delivery = {
  index: (params) => api.get('/delivery/routes', { params }),
  store: (data) => api.post('/delivery/routes', data),
  show: (id) => api.get(`/delivery/routes/${id}`),
  update: (id, data) => api.patch(`/delivery/routes/${id}`, data),

  getRoutes: (params) => api.get('/delivery/routes', { params }),
  getRouteDetail: (id) => api.get(`/delivery/routes/${id}`),
  createRoute: (data) => api.post('/delivery/routes', data),
  updateRoute: (id, data) => api.patch(`/delivery/routes/${id}`, data),
  getDrivers: () => api.get('/delivery/drivers'),
  getOrders: (params) => api.get('/delivery/orders', { params }),
  verifyOtp: (code) => api.post('/delivery/verify-otp', { otp_code: code }),
  updatePayment: (data) => api.patch('/delivery/update-payment', data),
  completePayment: (data) => api.post('/delivery/complete-payment', data),
  sendLocation: (data) => api.post('/delivery/location', data),
  getIncidents: (params) => api.get('/delivery/incidents', { params }),
  createIncident: (data) => api.post('/delivery/incidents', data),
  updateIncident: (id, data) => api.patch(`/delivery/incidents/${id}`, data),
};

// Comunicacion de peticiones (Reportes Contables - reports): consultas de valorizacion, conciliacion bancaria y exportacion
export const reports = {
  index: () => api.get('/reports'),
  get: () => api.get('/reports'),
  getFinancialKpis: () => api.get('/reports/financial-kpis'),
  getInventoryValuation: () => api.get('/reports/inventory-valuation'),
  closeInventorySnapshot: (data) => api.post('/reports/inventory-snapshots', data),
  getBankReconciliation: () => api.get('/reports/bank-reconciliation'),
  reconcileOrder: (id, data) => api.post(`/reports/reconcile-order/${id}`, data),
  exportFiltered: (params) => api.get('/reports/export-filtered', { params, responseType: 'blob' }),
  costs: () => api.get('/reports/costs'),
  stock: () => api.get('/reports/stock'),
  orders: () => api.get('/reports/orders'),
  download: (type) => api.get('/reports/download', { params: { type }, responseType: 'blob' }),
};

// Llenado de CRUDs (Perfil de Usuario - profile): consulta y actualizacion de datos personales, foto y contrasena
export const profile = {
  show: () => api.get('/profile'),
  update: (data) => api.patch('/profile', data),
  get: () => api.get('/profile'),
  uploadPhoto: (file) => {
    const form = new FormData();
    form.append('photo', file);
    return api.post('/profile/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getPhoto: () => api.get('/profile/photo', { responseType: 'blob' }),
  deletePhoto: () => api.delete('/profile/photo'),
  changePassword: (data) => api.patch('/profile/password', data),
  revokeSessions: () => api.delete('/profile/sessions'),
  updatePreferences: (data) => api.patch('/profile/preferences', data),
};

// Control de registro y roles + Llenado de CRUDs (Usuarios y Empresa - admin): listado, creacion, edicion y aprobacion de usuarios
export const admin = {
  index: () => api.get('/settings/users'),
  store: (data) => api.post('/settings/users', data),
  update: (id, data) => api.patch(`/settings/users/${id}`, data),

  getUsers: () => api.get('/settings/users'),
  createUser: (data) => api.post('/settings/users', data),
  updateUser: (id, data) => api.patch(`/settings/users/${id}`, data),
  toggleUserStatus: (id) => api.patch(`/settings/users/${id}/status`),
  getPendingUsers: () => api.get('/admin/pending-users'),
  approveUser: (id, data) => api.post(`/admin/users/${id}/approve`, data || {}),
  rejectUser: (id, data) => api.post(`/admin/users/${id}/reject`, data || {}),
  getCompany: () => api.get('/settings/company'),
  updateCompany: (data) => api.patch('/settings/company', data),
};

export default api;
