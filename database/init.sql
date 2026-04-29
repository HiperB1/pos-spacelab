-- DG Facturación Database Schema for PostgreSQL
-- Run this script to initialize the PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Configuration table
CREATE TABLE IF NOT EXISTS configuracion (
    id INTEGER PRIMARY KEY,
    prefijo TEXT DEFAULT 'DG-',
    empresa_nombre TEXT DEFAULT '',
    empresa_nit TEXT DEFAULT '',
    empresa_direccion TEXT DEFAULT '',
    empresa_telefono TEXT DEFAULT '',
    empresa_email TEXT DEFAULT '',
    siguiente_numero INTEGER DEFAULT 1
);

-- Insert default config if not exists
INSERT INTO configuracion (id, prefijo) VALUES (1, 'DG-')
ON CONFLICT (id) DO NOTHING;

-- Clientes table
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    nit TEXT,
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Materias primas table
CREATE TABLE IF NOT EXISTS materias_primas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    color TEXT,
    proveedor TEXT,
    cantidad_kg REAL DEFAULT 0,
    precio_kg REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subproductos table
CREATE TABLE IF NOT EXISTS subproductos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    cantidad INTEGER DEFAULT 0,
    costo REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Productos table
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio REAL DEFAULT 0,
    costo REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Producto componentes table
CREATE TABLE IF NOT EXISTS producto_componentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    subproducto_id UUID NOT NULL REFERENCES subproductos(id) ON DELETE CASCADE,
    cantidad_necesaria INTEGER DEFAULT 1
);

-- Facturas table
CREATE TABLE IF NOT EXISTS facturas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero TEXT NOT NULL UNIQUE,
    cliente_id UUID REFERENCES clientes(id),
    cliente_nombre TEXT,
    cliente_nit TEXT,
    cliente_direccion TEXT,
    fecha TEXT NOT NULL,
    subtotal REAL DEFAULT 0,
    iva REAL DEFAULT 0,
    total REAL DEFAULT 0,
    estado TEXT DEFAULT 'activa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Factura items table
CREATE TABLE IF NOT EXISTS factura_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    cantidad INTEGER DEFAULT 1,
    precio REAL DEFAULT 0,
    total REAL DEFAULT 0
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_facturas_numero ON facturas(numero);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(fecha);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);

-- Comments
COMMENT ON TABLE configuracion IS 'Configuración general de la aplicación';
COMMENT ON TABLE clientes IS 'Clientes para facturación';
COMMENT ON TABLE materias_primas IS 'Inventario de materias primas (filamentos)';
COMMENT ON TABLE subproductos IS 'Inventario de subproductos/componentes';
COMMENT ON TABLE productos IS 'Productos terminados para venta';
COMMENT ON TABLE producto_componentes IS 'Componentes necesarios para cada producto';
COMMENT ON TABLE facturas IS 'Facturas emitidas';
COMMENT ON TABLE factura_items IS 'Items de cada factura';