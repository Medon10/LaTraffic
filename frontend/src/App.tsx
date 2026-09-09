import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Layout } from './componentes/Layout';
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { RegistroPage } from './pages/Registro';
import { RecuperarPasswordPage } from './pages/RecuperarPassword';
import { SeleccionViajePage } from './pages/SeleccionViaje';
import { CheckoutPage } from './pages/Checkout';
import { MisReservasPage } from './pages/MisReservas';

const NotFoundPage: React.FC = () => (
  <div className="page-container text-center">
    <div className="badge">Error 404</div>
    <h1>Página no encontrada</h1>
    <p className="subtitle">La página que estás buscando no existe o fue movida.</p>
    <div style={{ marginTop: '2rem' }}>
      <Link to="/" className="btn btn-primary">Volver al Inicio</Link>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegistroPage />} />
          <Route path="/recuperar-password" element={<RecuperarPasswordPage />} />
          <Route path="/seleccion-viaje" element={<SeleccionViajePage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/mis-reservas" element={<MisReservasPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
