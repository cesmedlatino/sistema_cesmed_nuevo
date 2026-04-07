import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PaymentsList } from '../payments/PaymentsList';
import { PaymentDialog } from '../payments/PaymentDialog';

export function Payments() {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showNewPaymentDialog, setShowNewPaymentDialog] = useState(false);
  const [selectedCuentaId, setSelectedCuentaId] = useState<string | null>(null);

  const handlePaymentSaved = (paymentId: string) => {
    setShowPaymentDialog(false);
    setShowNewPaymentDialog(false);
    // La tabla se actualiza automáticamente gracias a react-query
  };

  const handleSelectionChange = (cuentaId: string | null) => {
    setSelectedCuentaId(cuentaId);
  };

  const handleAddPayment = () => {
    if (!selectedCuentaId) {
      alert("Debe seleccionar una cuenta para agregar un pago");
      return;
    }
    setShowPaymentDialog(true);
  };

  const handleNewPayment = () => {
    setShowNewPaymentDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pagos</h1>
          <p className="text-muted-foreground">
            Gestiona todos los pagos registrados en el sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleNewPayment}>
            <Plus className="h-4 w-4" />
            Nuevo Pago
          </Button>
          <Button 
            onClick={handleAddPayment}
            disabled={!selectedCuentaId}
            variant={selectedCuentaId ? "default" : "outline"}
          >
            <Plus className="h-4 w-4" />
            {selectedCuentaId ? `Agregar Pago a ${selectedCuentaId}` : "Seleccione una cuenta"}
          </Button>
        </div>
      </div>
      <PaymentsList onSelectionChange={handleSelectionChange} />
      
      <PaymentDialog
        isOpen={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        onPaymentSaved={handlePaymentSaved}
        selectedCuentaId={selectedCuentaId}
      />

      <PaymentDialog
        isOpen={showNewPaymentDialog}
        onClose={() => setShowNewPaymentDialog(false)}
        onPaymentSaved={handlePaymentSaved}
        selectedCuentaId={null}
      />
    </div>
  );
}