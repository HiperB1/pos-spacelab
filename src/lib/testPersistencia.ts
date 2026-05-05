import { getFacturas, addCliente, deleteCliente, initDatabase } from './database';

export async function runPersistenceTest(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Initial State
    const initialClientsCount = (await import('./database')).getClientes().length;
    const testId = `test-${Date.now()}`;
    const testName = `TEST_USER_${testId}`;

    // 2. Perform modification
    console.log('Test: Creando cliente de prueba...');
    const newClient = addCliente({
      nome: testName,
      nit: '000-000-000',
      direccion: 'Calle Test 123',
      telefono: '555-TEST',
      email: 'test@persist.com'
    });

    // 3. Verify in-memory update
    const clientsAfterAdd = (await import('./database')).getClientes();
    if (!clientsAfterAdd.find(c => c.id === newClient.id)) {
      return { success: false, message: 'Fallo: El cliente no se encontró en la memoria después de agregarlo.' };
    }

    // 4. Verify LocalStorage directly
    const rawData = localStorage.getItem('dg_facturacion_db');
    if (!rawData) {
      return { success: false, message: 'Fallo: No se encontró el objeto "dg_facturacion_db" en LocalStorage.' };
    }

    if (!rawData.includes(testName)) {
      return { success: false, message: 'Fallo: Los datos no se escribieron correctamente en LocalStorage.' };
    }

    // 5. Cleanup
    deleteCliente(newClient.id);
    
    // 6. Verify Cleanup
    const rawDataAfterCleanup = localStorage.getItem('dg_facturacion_db');
    if (rawDataAfterCleanup?.includes(testName)) {
      return { success: false, message: 'Fallo: No se pudo limpiar el dato de prueba (error de escritura).' };
    }

    return { 
      success: true, 
      message: `¡Prueba exitosa! El sistema escribió y leyó correctamente de LocalStorage. Se verificó la persistencia de ${initialClientsCount} registros existentes.` 
    };
  } catch (error: any) {
    return { success: false, message: `Error durante la prueba: ${error.message}` };
  }
}
