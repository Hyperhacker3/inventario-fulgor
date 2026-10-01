-- 11. DATOS INICIALES (SEED DATA)
INSERT INTO public.almacenes (id, nombre, codigo, direccion, capacidad_total, ocupacion_actual, total_racks, total_items) VALUES
('ALM-BOG-01', 'Almacén Principal Bogotá', 'BOG-01', 'Calle 13 # 68-45, Fontibón, Bogotá', 5000, 3420, 12, 142),
('ALM-MED-02', 'Bodega Regional Medellín', 'MED-02', 'Cra 50 # 35-12, Itagüí, Antioquia', 3000, 1850, 8, 86),
('ALM-CAL-03', 'Bodega Suroccidente Cali', 'CAL-03', 'Calle 15 # 22-80, Yumbo, Valle del Cauca', 2500, 940, 6, 45)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.estanterias (id, almacen_id, nombre, codigo, total_cajas, descripcion) VALUES
('EST-A01', 'ALM-BOG-01', 'Estante A1 - Paneles Solar Alta Potencia', 'EST-A01', 4, 'Capacidad para estiba de paneles 550W a 700W'),
('EST-B02', 'ALM-BOG-01', 'Estante B2 - Inversores Industriales', 'EST-B02', 6, 'Carga pesada para inversores string trifásicos'),
('EST-C03', 'ALM-BOG-01', 'Estante C3 - Accesorios y Conectores MC4', 'EST-C03', 12, 'Gaveteros de conectores, herramientas y fusibles'),
('EST-D04', 'ALM-BOG-01', 'Estante D4 - Carretes de Cable Solar', 'EST-D04', 8, 'Racks especiales de desenrollado para cable 4mm y 6mm')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cajas (id, estanteria_id, nombre, codigo, estado, capacidad, descripcion) VALUES
('CAJ-A01-01', 'EST-C03', 'Caja Conectores MC4 Macho/Hembra', 'CAJ-MC4-01', 'COMPLETA', 500, 'Bolsas de 50 und con pines plateados'),
('CAJ-A01-02', 'EST-C03', 'Caja Fusibles DC 1000V 15A', 'CAJ-FUS-02', 'PARCIAL', 200, 'Fusibles cerámicos gPV 10x38mm'),
('CAJ-A01-03', 'EST-C03', 'Caja Terminales de Ojo 6mm²', 'CAJ-TERM-03', 'VACIA', 300, 'Terminales de cobre estañado')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.proyectos (id, nombre, cliente, ubicacion, fecha_inicio) VALUES
('PROY-001', 'Parque Solar La Dorada 5MW', 'Celsia Energía', 'La Dorada, Caldas', '2026-01-15'),
('PROY-002', 'Techo Solar Industrial Bavaria', 'Bavaria & Cía', 'Tocancipá, Cundinamarca', '2026-02-01'),
('PROY-003', 'Granja Solar Guajira I', 'Enel Colombia', 'Maicao, La Guajira', '2026-03-10'),
('PROY-004', 'Autoconsumo Centro Comercial Titán', 'Titán Plaza', 'Bogotá D.C.', '2026-04-05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.elementos (id, codigo, nombre, categoria, cantidad, stock_minimo, unidad, almacen_id, estanteria_id, caja_id, foto_url, descripcion, especificaciones) VALUES
('ELM-001', 'PAN550', 'Panel Solar Monocristalino PERC 550W', 'PANELES', 184, 40, 'UND', 'ALM-BOG-01', 'EST-A01', NULL, 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=600&q=80', 'Módulo fotovoltaico de alta eficiencia 144 celdas half-cut, marco de aluminio anodizado.', '{"potencia": "550W", "tipo": "Monocristalino PERC", "dimensiones": "2278 x 1134 x 35 mm", "peso": "28.5 kg", "eficiencia": "21.3%"}'),
('ELM-002', 'PAN450', 'Panel Solar Monocristalino Bifacial 450W', 'PANELES', 75, 30, 'UND', 'ALM-BOG-01', 'EST-A01', NULL, 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=600&q=80', 'Panel bifacial vidrio-vidrio para alta captación de albedo en terrenos claros.', '{"potencia": "450W", "tipo": "Bifacial Vidrio-Vidrio", "dimensiones": "2094 x 1038 x 30 mm", "peso": "24.0 kg", "eficiencia": "20.7%"}'),
('ELM-003', 'INV042', 'Inversor String On-Grid 50kW 480V', 'INVERSORES', 12, 5, 'UND', 'ALM-BOG-01', 'EST-B02', NULL, 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80', 'Inversor trifásico con 4 MPPT independientes, eficiencia máxima del 98.6%.', '{"potenciaNominal": "50 kW", "voltajeSalida": "480V AC Trifásico", "mppt": "4", "eficiencia": "98.6%", "proteccion": "IP66"}'),
('ELM-004', 'CAB600', 'Cable Solar Fotovoltaico 6mm² Rojo (1000m)', 'CABLES', 8, 3, 'ROL', 'ALM-BOG-01', 'EST-D04', NULL, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80', 'Carrete de cable solar libre de halógenos, resistente a rayos UV y temperaturas extremas.', '{"calibre": "6mm² (10 AWG)", "aislamiento": "XLPO doble aislamiento", "tensionNominal": "1500V DC", "longitud": "1000 metros"}'),
('ELM-005', 'CAB400', 'Cable Solar Fotovoltaico 4mm² Negro (1000m)', 'CABLES', 14, 4, 'ROL', 'ALM-BOG-01', 'EST-D04', NULL, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80', 'Carrete de cable solar negro polo negativo, norma EN 50618.', '{"calibre": "4mm² (12 AWG)", "aislamiento": "XLPO resistente UV", "tensionNominal": "1500V DC", "longitud": "1000 metros"}'),
('ELM-006', 'MC4100', 'Conectores MC4 Originales Macho/Hembra', 'CONECTORES', 620, 150, 'PAR', 'ALM-BOG-01', 'EST-C03', 'CAJ-A01-01', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80', 'Juego de conectores solares certificados IP68, compatibles con cables de 4mm² y 6mm².', '{"corrienteNominal": "30A", "voltaje": "1500V DC", "gradoProteccion": "IP68"}'),
('ELM-007', 'EST001', 'Estructura Aluminio Riel 4.2m para Techo', 'ESTRUCTURAS', 140, 30, 'UND', 'ALM-BOG-01', 'EST-A01', NULL, 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80', 'Perfil de montaje de aluminio extruido AL6005-T5 para fijación de paneles en cubierta.', '{"longitud": "4.2 metros", "material": "Aluminio AL6005-T5 anodizado", "peso": "4.1 kg"}'),
('ELM-008', 'FUS015', 'Fusible DC 15A 1000V con Portafusible', 'PROTECCIONES', 180, 50, 'UND', 'ALM-BOG-01', 'EST-C03', 'CAJ-A01-02', 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80', 'Protección sobrecorriente para strings fotovoltaicos.', '{"amperaje": "15A", "voltaje": "1000V DC", "tamano": "10x38 mm"}')
ON CONFLICT (id) DO NOTHING;
