import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthWrapper } from './components/AuthWrapper';
import { AppLayout } from './components/AppLayout';
import { PharmacyLayout } from './components/pharmacy/PharmacyLayout';
import { OpticsLayout } from './components/optics/OpticsLayout';
import { Index } from './components/modules/Index';
import { Patients } from './components/modules/Patients';
import { MedicalRecords } from './components/modules/MedicalRecords';
import { MedicalRecordDesigner } from './components/modules/MedicalRecordDesigner';
import { Appointments } from './components/modules/Appointments';
import { Prescriptions } from './components/modules/Prescriptions';
import { Payments } from './components/modules/Payments';
import { Specialists } from './components/modules/Specialists';
import { MedicalSpecialties } from './components/modules/MedicalSpecialties';
import { Staff } from './components/modules/Staff';
import { UsersManagement } from './components/modules/Users';
import { ConsultingRooms } from './components/modules/ConsultingRooms';
import { NotFound } from './components/NotFound';
import { NewAppointment } from './pages/NewAppointment';
import { OpeningHours } from "@/components/modules/OpeningHours";
import { Shifts } from "@/components/modules/Shifts";
import { MedicalCenterConfig } from "@/components/modules/MedicalCenterConfig";
import { Horarios } from "@/components/modules/Horarios";
import { AttendanceQueue } from "@/components/modules/AttendanceQueue";
import { RegistroAtenciones } from "@/components/modules/RegistroAtenciones";
import { Pharmacy } from "@/components/modules/Pharmacy";
import { PharmacyMedicationsPage } from "@/components/pharmacy/PharmacyMedicationsPage";
import { PharmacyInventoryPage } from "@/components/pharmacy/PharmacyInventoryPage";
import { PharmacyEntriesPage } from "@/components/pharmacy/PharmacyEntriesPage";
import { PharmacyOutputsPage } from "@/components/pharmacy/PharmacyOutputsPage";
import { PharmacyReportsPage } from "@/components/pharmacy/PharmacyReportsPage";
import { PharmacySuppliersPage } from "@/components/pharmacy/PharmacySuppliersPage";
import { PharmacyAlertsPage } from "@/components/pharmacy/PharmacyAlertsPage";
import { PharmacyConfigPage } from "@/components/pharmacy/PharmacyConfigPage";
import { PharmacyInvoicesPage } from "@/components/pharmacy/PharmacyInvoicesPage";
import { PharmacyComprobantesPage } from "@/components/pharmacy/PharmacyComprobantesPage";
import { PharmacyFormulasMagistralesPage } from "@/components/pharmacy/PharmacyFormulasMagistralesPage";
import { PharmacyMovementHistoryPage } from "@/components/pharmacy/PharmacyMovementHistoryPage";
import { Optics } from "@/components/modules/Optics";
import { OpticsProductsPage } from "@/components/optics/OpticsProductsPage";
import { OpticsProductDetailPage } from "@/components/optics/OpticsProductDetailPage";
import { CatalogoGeneralPage } from "@/components/optics/catalogo-general/CatalogoGeneralPage";
import { CatalogoGeneralDetailPage } from "@/components/optics/catalogo-general/CatalogoGeneralDetailPage";
import { OpticsInventoryPage } from "@/components/optics/OpticsInventoryPage";
import { OpticsEntriesPage } from "@/components/optics/OpticsEntriesPage";
import { OpticsOutputsPage } from "@/components/optics/OpticsOutputsPage";
import { OpticsSuppliersPage } from "@/components/optics/OpticsSuppliersPage";
import { OpticsLabelDesignerPage } from "@/components/optics/OpticsLabelDesignerPage";
import { OpticsAlertsPage } from "@/components/optics/OpticsAlertsPage";
import { OpticsReportsPage } from "@/components/optics/OpticsReportsPage";
import OpticsConfigPage from "@/components/optics/OpticsConfigPage";
import { SuppliesLayout } from "@/components/supplies/SuppliesLayout";
import { Supplies } from "@/components/modules/Supplies";
import { SuppliesProductsPage } from "@/components/supplies/SuppliesProductsPage";
import { SuppliesEntriesPage } from "@/components/supplies/SuppliesEntriesPage";
import { SuppliesOutputsPage } from "@/components/supplies/SuppliesOutputsPage";
import { SuppliesAlertsPage } from "@/components/supplies/SuppliesAlertsPage";
import { SuppliesSuppliersPage } from "@/components/supplies/SuppliesSuppliersPage";
import { SuppliesConsultingRoomStockPage } from "@/components/supplies/SuppliesConsultingRoomStockPage";
import { Programaciones } from "@/components/modules/Programaciones";
import Calendarizacion from "@/components/modules/Calendarizacion";
import LoadEnfermedades from "@/pages/LoadEnfermedades";

import { Comprobantes } from './components/modules/Comprobantes';
import { ComprobanteDesignerModule } from './components/modules/ComprobanteDesigner';
import { Reports } from './components/modules/Reports';
import { Expenses } from './components/modules/Expenses';

// Kardex System
import { KardexLayout } from './components/kardex/KardexLayout';
import { KardexDashboard } from './components/kardex/KardexDashboard';
import { KardexConsolidado } from './components/kardex/KardexConsolidado';
import { KardexBotica } from './components/kardex/KardexBotica';
import { KardexOptica } from './components/kardex/KardexOptica';
import { KardexSuministros } from './components/kardex/KardexSuministros';
import { KardexReportes } from './components/kardex/KardexReportes';
import { KardexConfiguracion } from './components/kardex/KardexConfiguracion';
import { KardexProductoIndividual } from './components/kardex/KardexProductoIndividual';

function App() {
  return (
    <Router>
      <Routes>
        {/* Sistema Principal CESMED */}
        <Route path="/" element={<AuthWrapper><AppLayout><Index /></AppLayout></AuthWrapper>} />
        <Route path="/patients" element={<AuthWrapper><AppLayout><Patients /></AppLayout></AuthWrapper>} />
        <Route path="/medical-records" element={<AuthWrapper><AppLayout><MedicalRecords /></AppLayout></AuthWrapper>} />
        <Route path="/medical-record-designer" element={<AuthWrapper><AppLayout><MedicalRecordDesigner /></AppLayout></AuthWrapper>} />
        <Route path="/appointments" element={<AuthWrapper><AppLayout><Appointments /></AppLayout></AuthWrapper>} />
        <Route path="/calendarizacion" element={<AuthWrapper><AppLayout><Calendarizacion /></AppLayout></AuthWrapper>} />
        <Route path="/appointments/new" element={<AuthWrapper><NewAppointment /></AuthWrapper>} />
        <Route path="/programaciones" element={<AuthWrapper><AppLayout><Programaciones /></AppLayout></AuthWrapper>} />
        <Route path="/attendance-queue" element={<AuthWrapper><AppLayout><AttendanceQueue /></AppLayout></AuthWrapper>} />
        <Route path="/registro-atenciones" element={<AuthWrapper><AppLayout><RegistroAtenciones /></AppLayout></AuthWrapper>} />
        <Route path="/prescriptions" element={<AuthWrapper><AppLayout><Prescriptions /></AppLayout></AuthWrapper>} />
        <Route path="/payments" element={<AuthWrapper><AppLayout><Payments /></AppLayout></AuthWrapper>} />
        <Route path="/comprobantes" element={<AuthWrapper><AppLayout><Comprobantes /></AppLayout></AuthWrapper>} />
        <Route path="/reports" element={<AuthWrapper><AppLayout><Reports /></AppLayout></AuthWrapper>} />
        <Route path="/expenses" element={<AuthWrapper><AppLayout><Expenses /></AppLayout></AuthWrapper>} />
        <Route path="/comprobante-designer" element={<AuthWrapper><AppLayout><ComprobanteDesignerModule /></AppLayout></AuthWrapper>} />
        <Route path="/specialists" element={<AuthWrapper><AppLayout><Specialists /></AppLayout></AuthWrapper>} />
        <Route path="/medical-specialties" element={<AuthWrapper><AppLayout><MedicalSpecialties /></AppLayout></AuthWrapper>} />
        <Route path="/staff" element={<AuthWrapper><AppLayout><Staff /></AppLayout></AuthWrapper>} />
        <Route path="/users" element={<AuthWrapper><AppLayout><UsersManagement /></AppLayout></AuthWrapper>} />
        <Route path="/consulting-rooms" element={<AuthWrapper><AppLayout><ConsultingRooms /></AppLayout></AuthWrapper>} />
        <Route path="/horarios" element={<AuthWrapper><AppLayout><Horarios /></AppLayout></AuthWrapper>} />
        <Route path="/shifts" element={<AuthWrapper><AppLayout><Shifts /></AppLayout></AuthWrapper>} />
        <Route path="/opening-hours" element={<AuthWrapper><AppLayout><OpeningHours /></AppLayout></AuthWrapper>} />
        <Route path="/medical-center-config" element={<AuthWrapper><AppLayout><MedicalCenterConfig /></AppLayout></AuthWrapper>} />
        <Route path="/load-enfermedades" element={<AuthWrapper><AppLayout><LoadEnfermedades /></AppLayout></AuthWrapper>} />
        
        {/* Sistema de Farmacia con layout propio */}
        <Route path="/pharmacy" element={<AuthWrapper><PharmacyLayout><Pharmacy /></PharmacyLayout></AuthWrapper>} />
        <Route path="/pharmacy/medications" element={<AuthWrapper><PharmacyLayout><PharmacyMedicationsPage /></PharmacyLayout></AuthWrapper>} />
        <Route path="/pharmacy/inventory" element={<AuthWrapper><PharmacyLayout><PharmacyInventoryPage /></PharmacyLayout></AuthWrapper>} />
        <Route path="/pharmacy/entries" element={<AuthWrapper><PharmacyLayout><PharmacyEntriesPage /></PharmacyLayout></AuthWrapper>} />
        <Route path="/pharmacy/outputs" element={<AuthWrapper><PharmacyLayout><PharmacyOutputsPage /></PharmacyLayout></AuthWrapper>} />
        <Route path="/pharmacy/suppliers" element={<AuthWrapper><PharmacyLayout><PharmacySuppliersPage /></PharmacyLayout></AuthWrapper>} />
        <Route path="/pharmacy/movements" element={<AuthWrapper><PharmacyLayout><PharmacyInventoryPage /></PharmacyLayout></AuthWrapper>} />
        <Route path="/pharmacy/comprobantes" element={<AuthWrapper><PharmacyLayout><PharmacyComprobantesPage /></PharmacyLayout></AuthWrapper>} />
        <Route path="/pharmacy/invoices" element={<AuthWrapper><PharmacyLayout><PharmacyInvoicesPage /></PharmacyLayout></AuthWrapper>} />
        <Route path="/pharmacy/formulas-magistrales" element={<AuthWrapper><PharmacyLayout><PharmacyFormulasMagistralesPage /></PharmacyLayout></AuthWrapper>} />
        <Route path="/pharmacy/movement-history" element={<AuthWrapper><PharmacyLayout><PharmacyMovementHistoryPage /></PharmacyLayout></AuthWrapper>} />
        <Route path="/pharmacy/alerts" element={<AuthWrapper><PharmacyLayout><PharmacyAlertsPage /></PharmacyLayout></AuthWrapper>} />
        <Route path="/pharmacy/reports" element={<AuthWrapper><PharmacyLayout><PharmacyReportsPage /></PharmacyLayout></AuthWrapper>} />
        <Route path="/pharmacy/settings" element={<AuthWrapper><PharmacyLayout><PharmacyConfigPage /></PharmacyLayout></AuthWrapper>} />
        
        {/* Sistema de Óptica con layout propio */}
        <Route path="/optics" element={<AuthWrapper><OpticsLayout><Optics /></OpticsLayout></AuthWrapper>} />
        <Route path="/optics/products" element={<AuthWrapper><OpticsLayout><OpticsProductsPage /></OpticsLayout></AuthWrapper>} />
        <Route path="/optics/product/:codigo" element={<AuthWrapper><OpticsLayout><OpticsProductDetailPage /></OpticsLayout></AuthWrapper>} />
        <Route path="/optics/catalogo-general" element={<AuthWrapper><OpticsLayout><CatalogoGeneralPage /></OpticsLayout></AuthWrapper>} />
        <Route path="/optics/catalogo-general/:codigo" element={<AuthWrapper><OpticsLayout><CatalogoGeneralDetailPage /></OpticsLayout></AuthWrapper>} />
        <Route path="/optics/inventory" element={<AuthWrapper><OpticsLayout><OpticsInventoryPage /></OpticsLayout></AuthWrapper>} />
        <Route path="/optics/entries" element={<AuthWrapper><OpticsLayout><OpticsEntriesPage /></OpticsLayout></AuthWrapper>} />
        <Route path="/optics/outputs" element={<AuthWrapper><OpticsLayout><OpticsOutputsPage /></OpticsLayout></AuthWrapper>} />
        <Route path="/optics/suppliers" element={<AuthWrapper><OpticsLayout><OpticsSuppliersPage /></OpticsLayout></AuthWrapper>} />
        <Route path="/optics/label-designer" element={<AuthWrapper><OpticsLabelDesignerPage /></AuthWrapper>} />
        <Route path="/optics/alerts" element={<AuthWrapper><OpticsLayout><OpticsAlertsPage /></OpticsLayout></AuthWrapper>} />
        <Route path="/optics/reports" element={<AuthWrapper><OpticsLayout><OpticsReportsPage /></OpticsLayout></AuthWrapper>} />
        <Route path="/optics/settings" element={<AuthWrapper><OpticsLayout><OpticsConfigPage /></OpticsLayout></AuthWrapper>} />
        
        {/* Sistema de Suministros con layout propio */}
        <Route path="/supplies" element={<AuthWrapper><SuppliesLayout><Supplies /></SuppliesLayout></AuthWrapper>} />
        <Route path="/supplies/products" element={<AuthWrapper><SuppliesLayout><SuppliesProductsPage /></SuppliesLayout></AuthWrapper>} />
        <Route path="/supplies/inventory" element={<AuthWrapper><SuppliesLayout><Supplies /></SuppliesLayout></AuthWrapper>} />
        <Route path="/supplies/entries" element={<AuthWrapper><SuppliesLayout><SuppliesEntriesPage /></SuppliesLayout></AuthWrapper>} />
        <Route path="/supplies/outputs" element={<AuthWrapper><SuppliesLayout><SuppliesOutputsPage /></SuppliesLayout></AuthWrapper>} />
        <Route path="/supplies/consulting-room-stock" element={<AuthWrapper><SuppliesLayout><SuppliesConsultingRoomStockPage /></SuppliesLayout></AuthWrapper>} />
        <Route path="/supplies/suppliers" element={<AuthWrapper><SuppliesLayout><SuppliesSuppliersPage /></SuppliesLayout></AuthWrapper>} />
        <Route path="/supplies/label-designer" element={<AuthWrapper><SuppliesLayout><Supplies /></SuppliesLayout></AuthWrapper>} />
        <Route path="/supplies/alerts" element={<AuthWrapper><SuppliesLayout><SuppliesAlertsPage /></SuppliesLayout></AuthWrapper>} />
        <Route path="/supplies/reports" element={<AuthWrapper><SuppliesLayout><Supplies /></SuppliesLayout></AuthWrapper>} />
        <Route path="/supplies/settings" element={<AuthWrapper><SuppliesLayout><Supplies /></SuppliesLayout></AuthWrapper>} />
        
        {/* Sistema de Kardex con layout propio */}
        <Route path="/kardex" element={<AuthWrapper><KardexLayout><KardexDashboard /></KardexLayout></AuthWrapper>} />
        <Route path="/kardex/consolidado" element={<AuthWrapper><KardexLayout><KardexConsolidado /></KardexLayout></AuthWrapper>} />
        <Route path="/kardex/botica" element={<AuthWrapper><KardexLayout><KardexBotica /></KardexLayout></AuthWrapper>} />
        <Route path="/kardex/optica" element={<AuthWrapper><KardexLayout><KardexOptica /></KardexLayout></AuthWrapper>} />
        <Route path="/kardex/suministros" element={<AuthWrapper><KardexLayout><KardexSuministros /></KardexLayout></AuthWrapper>} />
        <Route path="/kardex/individual" element={<AuthWrapper><KardexLayout><KardexProductoIndividual /></KardexLayout></AuthWrapper>} />
        <Route path="/kardex/reportes" element={<AuthWrapper><KardexLayout><KardexReportes /></KardexLayout></AuthWrapper>} />
        <Route path="/kardex/configuracion" element={<AuthWrapper><KardexLayout><KardexConfiguracion /></KardexLayout></AuthWrapper>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
