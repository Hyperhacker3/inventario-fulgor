import { Almacen, Estanteria, Caja, Proyecto, Elemento, HistorialMovimiento, Remision, UserProfile } from '../types';

export const INITIAL_USER: UserProfile = {
  name: 'Carlos Ramírez',
  role: 'Jefe de Bodega Central',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUJkWlY8dkqZsOqFSUJix8xBHDY6iYaR8zYDNfEiEmHBvnwl002YTtm58aHpuQuDyZXrAT7ZtcC0h1Dk4zwF7rC83_qnZZZyArWgLl_VRkr7lOEdnD14HuuKQiy5EIIGGx6ChxyvH7CIQHE8bnaZIU-YjCs-SuMp_bNXEa5q8bDeBy3v010LXSaxyTJAiPBBXTWHHAZE-wQmrD0k2l92QWKqYRwFWtKI_X3eOsQZp20iM6gLLHKVLH',
  email: 'carlos.ramirez@fulgorsas.com'
};

export const INITIAL_PROYECTOS: Proyecto[] = [
  {
    id: 1,
    nombre: 'Granja Solar La Dorada',
    cliente: 'EcoEnergía Andina',
    ubicacion: 'Lote 4B, Vía Nacional 45, La Dorada, Caldas',
    estado: 'ACTIVO',
    createdAt: '2026-01-10'
  },
  {
    id: 2,
    nombre: 'Techo Industrial Bavaria',
    cliente: 'Cervecería Bavaria S.A.',
    ubicacion: 'Parque Industrial Tocancipá, Cundinamarca',
    estado: 'ACTIVO',
    createdAt: '2026-02-15'
  },
  {
    id: 3,
    nombre: 'Proyecto Off-Grid Amazonas',
    cliente: 'Gobernación del Amazonas',
    ubicacion: 'Comunidad Indígena Macedonia, Leticia',
    estado: 'ACTIVO',
    createdAt: '2026-03-01'
  },
  {
    id: 4,
    nombre: 'Parque Solar Girasol (Fase II)',
    cliente: 'Consorcio Solar del Valle',
    ubicacion: 'Km 12 Vía Yumbo, Valle del Cauca',
    estado: 'ACTIVO',
    createdAt: '2026-03-20'
  },
  {
    id: 5,
    nombre: 'Proyecto Techo Industrial Norte',
    cliente: 'Industrias Metálicas del Norte',
    ubicacion: 'Zona Industrial Barranquilla, Atlántico',
    estado: 'ACTIVO',
    createdAt: '2026-04-05'
  }
];

export const INITIAL_ALMACENES: Almacen[] = [
  {
    id: 1,
    codigo: 'BOG-01',
    nombre: 'Almacén Principal',
    descripcion: 'Centro logístico principal de distribución y acopio solar',
    ciudad: 'Bogotá D.C.',
    capacidadPorcentaje: 85,
    estado: 'Operativo'
  },
  {
    id: 2,
    codigo: 'MED-02',
    nombre: 'Bodega Norte',
    descripcion: 'Bodega regional para proyectos Antioquia y Costa Atlántica',
    ciudad: 'Medellín',
    capacidadPorcentaje: 40,
    estado: 'Mantenimiento'
  },
  {
    id: 3,
    codigo: 'CAL-03',
    nombre: 'Bodega Suroccidente',
    descripcion: 'Centro de acopio para Valle del Cauca, Cauca y Nariño',
    ciudad: 'Cali',
    capacidadPorcentaje: 62,
    estado: 'Operativo'
  }
];

export const INITIAL_ESTANTERIAS: Estanteria[] = [
  {
    id: 1,
    almacenId: 1,
    codigo: 'EST-A01',
    nombre: 'Zona Paneles',
    descripcion: 'Racks pesados para estiba y módulos fotovoltaicos'
  },
  {
    id: 2,
    almacenId: 1,
    codigo: 'EST-B02',
    nombre: 'Zona Inversores',
    descripcion: 'Estantes ventilados para inversores de string y microinversores'
  },
  {
    id: 3,
    almacenId: 1,
    codigo: 'EST-C03',
    nombre: 'Zona Cableado y Conectores',
    descripcion: 'Bobinas de cables solares DC/AC y accesorios de conexionado'
  },
  {
    id: 4,
    almacenId: 1,
    codigo: 'EST-D04',
    nombre: 'Zona Estructuras y Fijación',
    descripcion: 'Rieles de aluminio, clamps y anclajes solares'
  },
  {
    id: 5,
    almacenId: 2,
    codigo: 'EST-N01',
    nombre: 'Zona de Recepción y Ensayos',
    descripcion: 'Inspección técnica y almacenamiento temporal'
  },
  {
    id: 6,
    almacenId: 2,
    codigo: 'EST-N02',
    nombre: 'Zona de Repuestos y Accesorios',
    descripcion: 'Fusibles, MC4, llaves dinamométricas'
  }
];

export const INITIAL_CAJAS: Caja[] = [
  {
    id: 1,
    estanteriaId: 1,
    codigoCaja: 'CAJ-1045',
    estado: 'Completa',
    descripcion: 'Paneles monocristalinos 550W Tier 1 (Pallet 1)'
  },
  {
    id: 2,
    estanteriaId: 1,
    codigoCaja: 'CAJ-1046',
    estado: 'Parcial',
    descripcion: 'Paneles monocristalinos 450W Jinko (Pallet 2)'
  },
  {
    id: 3,
    estanteriaId: 2,
    codigoCaja: 'CAJ-2010',
    estado: 'Completa',
    descripcion: 'Inversores Huawei SUN2000 100KTL'
  },
  {
    id: 4,
    estanteriaId: 2,
    codigoCaja: 'CAJ-2011',
    estado: 'Parcial',
    descripcion: 'Inversores String 50kW Trifásicos'
  },
  {
    id: 5,
    estanteriaId: 2,
    codigoCaja: 'CAJ-2012',
    estado: 'Parcial',
    descripcion: 'Inversores String 5kW Trifásicos'
  },
  {
    id: 6,
    estanteriaId: 3,
    codigoCaja: 'CAJ-3050',
    estado: 'Completa',
    descripcion: 'Rollos de cable solar 6mm² rojo/negro'
  },
  {
    id: 7,
    estanteriaId: 3,
    codigoCaja: 'CAJ-3051',
    estado: 'Parcial',
    descripcion: 'Conectores MC4 macho/hembra 1500V'
  },
  {
    id: 8,
    estanteriaId: 4,
    codigoCaja: 'CAJ-4001',
    estado: 'Completa',
    descripcion: 'Estructuras de aluminio anodizado 4.2m'
  }
];

export const INITIAL_ELEMENTOS: Elemento[] = [
  {
    id: 1,
    codigo: 'PAN550',
    nombre: 'Panel Solar Monocristalino 550W',
    descripcion: 'Módulo fotovoltaico monocristalino PERC de alta eficiencia 550W Tier 1, marco de aluminio anodizado plateado, vidrio templado anti-reflejo.',
    categoria: 'PANELES',
    cantidad: 124,
    unidad: 'und',
    fotoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyg0C5mSCaSnpfqADkOQUpqlsZnFLdbYeD_eM9AWUtdXH4KFuslC3MZZo-QfPqemt6fffRhKHT7bR_lRU70wgkxynsJgDRAzWeEmcyEc-k5frMTpGggZ69t-GQbCy5RKfvY1dqnJVEhgk2GgoG3TZZfIk1h8HOU1WaBL8dgyXpGBsVt3OaWmp3Cxv2R_AoBgnwS_iScvivRH_zbK2Fik6iddOWHoAqGNV_l2Sy3b6jyxLCLzoFQQCj',
    almacenId: 1,
    estanteriaId: 1,
    cajaId: 1,
    stockMinimo: 30,
    valorUnitario: 145,
    createdAt: '2026-01-15',
    updatedAt: '2026-08-20'
  },
  {
    id: 2,
    codigo: 'PAN450',
    nombre: 'Panel Solar 450W Monocristalino',
    descripcion: 'Panel solar fotovoltaico de 450W con tecnología Half-Cell para cubiertas residenciales y comerciales.',
    categoria: 'PANELES',
    cantidad: 142,
    unidad: 'und',
    fotoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBcj4e5zyet82eWOSPvuOaQ4GOFPxOVpt6Hb2T4FFCcHBMtVHmK_y5piWNLXazamuDKpDxp15gmLbLknUm3t2xCWONvtrjVRF4KGt9BUaaXZuOKXNVbfW28h20rncjKEvPpCq4GaWmh2zJbR7NkD1q-1PQDWZ4M0WdmIlAjhytSMOaWuoFDGAs1zhkAxBkp1X1Vay7J7GQdBzIS-3o00H-l2I7scuQrOSzPO9CdFZSwpsgXu6fInNC1',
    almacenId: 1,
    estanteriaId: 1,
    cajaId: 2,
    stockMinimo: 25,
    valorUnitario: 120,
    createdAt: '2026-01-20',
    updatedAt: '2026-08-21'
  },
  {
    id: 3,
    codigo: 'INV100',
    nombre: 'Inversor Huawei SUN2000-100KTL',
    descripcion: 'Inversor trifásico 100kW Smart String de alta confiabilidad con 10 MPPTs independientes y monitoreo inteligente.',
    categoria: 'INVERSORES',
    cantidad: 5,
    unidad: 'und',
    fotoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBv31YyEFeZYTwd-dVrsttF5mBG4wzwK--FVuvQbQk62GsoXy_JjSVOb7sdrxYiGn_Z9qEV6dBb9J1CmyuTPDCOBhyulid-tCKv4weYAvQJJlGkudgcUH4MEt5tKL-4Kkjt24Gkui-U91iQLgWDuvQQCxT3rB0GKD9pMNvkFhCQI1hbF1ngyDCWqIyKSTMgZHS7BhjYQXI_eJ0mWSzJEeM8DnA1hqC5lv2D4FmZM4lR3T2RUmp7yKwH',
    almacenId: 1,
    estanteriaId: 2,
    cajaId: 3,
    stockMinimo: 3,
    valorUnitario: 4800,
    createdAt: '2026-02-01',
    updatedAt: '2026-08-22'
  },
  {
    id: 4,
    codigo: 'INV050',
    nombre: 'Inversor String 50kW Tri',
    descripcion: 'Inversor trifásico comercial e industrial de 50kW con protecciones integradas AC/DC tipo II y conectividad RS485/WiFi.',
    categoria: 'INVERSORES',
    cantidad: 50,
    unidad: 'und',
    fotoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKOLbP5MP6n8tnH0GDoJQu4GpKGAluoVsz1IXv0EcbI3dFC4DiJ0EgT95qBFjzojPelV2b2-k8vTzHf_nYMNZEJxvMg1zn-eujWP6SM5sgms7nHiPHOmsUu6FAFJkM9ReyOo0YAJUM5-8DQte0O0uaoga5zfBr2cEwfFaEbIhcbTCLd_7Vbw2yb2HG8sMF_BUjrMFDVsbS5UuUkiFGZ4yCWFQ7EgANYf6G6v9MGLbKKMSXsslSlquz',
    almacenId: 1,
    estanteriaId: 2,
    cajaId: 4,
    stockMinimo: 10,
    valorUnitario: 2900,
    createdAt: '2026-02-10',
    updatedAt: '2026-08-23'
  },
  {
    id: 5,
    codigo: 'INV042',
    nombre: 'Inversor String 5kW Trifásico',
    descripcion: 'Inversor trifásico de 5kW ideal para instalaciones solares en techos de medianas empresas y proyectos piloto.',
    categoria: 'INVERSORES',
    cantidad: 5,
    unidad: 'und',
    fotoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNHbo9w4FCGgJ3NtZ_wtWV346JNBMv1SYypPylxDpYAvaX5z53KDtSuAWDFfQKaQSMeDMpsvjrhU0uej_Y2tll9jQGze0geRvQ0wIX-s5bnWntBOn3HKRvCFo2oLOFMqg34F8_WrOxV2xinnLyO8YcGqUsm32FvcJYKHrvGmBkdDnULb-NgdPATu7dH1jAVR8jFZZrGwkAKSHCrHeg4ywZLxwMg_Ff5bl-tE3jmuuJzXfjZAlkJWEk',
    almacenId: 1,
    estanteriaId: 2,
    cajaId: 5,
    stockMinimo: 8,
    valorUnitario: 1100,
    createdAt: '2026-02-15',
    updatedAt: '2026-08-23'
  },
  {
    id: 6,
    codigo: 'CAB600',
    nombre: 'Cable Solar 6mm² Rojo (Rollo 100m)',
    descripcion: 'Cable unipolar de cobre estañado clase 5 con aislamiento XLPO resistente a rayos UV y temperaturas extremas (-40°C a +90°C).',
    categoria: 'CABLES',
    cantidad: 0,
    unidad: 'rll',
    fotoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdLUqbNmVVUx-v4AvXXmDITjCPNTi_UVduLLs5QsxRDcLhPzvo13nXcYcdBRAxNVuCTTHZHiL9W5dCbI4BHEaE9Oeke9cmm3XPv_U4yzM-dPJtYEPceeFK6nB6O6GgH4_mDdmTmkJ_6T8_g6hxkO4U1v7Y1Ew56VUt-xu-8Hn5EMkjKD5anhQh7nczCj1i5QQ4rKhyW-3-Z-3-SpSck4sAT18rNjD78j8pXxcDV69q1QWCyGorNbvI',
    almacenId: 1,
    estanteriaId: 3,
    cajaId: 6,
    stockMinimo: 10,
    valorUnitario: 95,
    createdAt: '2026-03-01',
    updatedAt: '2026-08-23'
  },
  {
    id: 7,
    codigo: 'CAB500',
    nombre: 'Cable Solar 6mm² Rollo 500m',
    descripcion: 'Bobina industrial de cable solar 6mm² negro para tiradas largas en parques y granjas solares fotovoltaicas.',
    categoria: 'CABLES',
    cantidad: 0,
    unidad: 'rll',
    fotoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDo6w57uuymZoOprzG2UAJqpLm91EzpMqe39FynlnEVwbfE6fpjEqAsA_WHA0kwKuC1r1h6ZGWMar4L3bkdgsr5oimhCbNWQ1kQV_TV0ASHZL1PGgtAUIBn4LRrZEqLI2QN9F4Co13duDzPnTVUgwGnhxjVbnabtj5TeGMrhoAglwzLgTKQm2wwY5yUU41GysHmqVpVYrBoAMkQ_eYcQp37KHmvPaHUEaFwt3N0cs3CU0joS6RDKzs4',
    almacenId: 2,
    estanteriaId: 5,
    cajaId: 6,
    stockMinimo: 5,
    valorUnitario: 420,
    createdAt: '2026-03-10',
    updatedAt: '2026-08-24'
  },
  {
    id: 8,
    codigo: 'CON004',
    nombre: 'Conector MC4 Macho / Hembra 1500V',
    descripcion: 'Juego de conectores solares estándar MC4 con grado de protección IP68 y terminales de cobre plateado para 1500V DC.',
    categoria: 'CONECTORES',
    cantidad: 450,
    unidad: 'par',
    fotoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
    almacenId: 1,
    estanteriaId: 3,
    cajaId: 7,
    stockMinimo: 100,
    valorUnitario: 2.5,
    createdAt: '2026-03-15',
    updatedAt: '2026-08-24'
  },
  {
    id: 9,
    codigo: 'EST001',
    nombre: 'Estructura Coplanar Aluminio 4.2m',
    descripcion: 'Riel portante de aluminio extruido 6005-T5 con tornillería de acero inoxidable A2-70 para montaje de paneles solares.',
    categoria: 'ESTRUCTURAS',
    cantidad: 88,
    unidad: 'und',
    fotoUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=600&q=80',
    almacenId: 1,
    estanteriaId: 4,
    cajaId: 8,
    stockMinimo: 20,
    valorUnitario: 45,
    createdAt: '2026-03-20',
    updatedAt: '2026-08-24'
  },
  {
    id: 10,
    codigo: 'CAB400',
    nombre: 'Rollo Cable Solar 4mm² Negro (100m)',
    descripcion: 'Cable solar unipolar 4mm² doble aislamiento libre de halógenos para strings fotovoltaicos.',
    categoria: 'CABLES',
    cantidad: 65,
    unidad: 'rll',
    fotoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdLUqbNmVVUx-v4AvXXmDITjCPNTi_UVduLLs5QsxRDcLhPzvo13nXcYcdBRAxNVuCTTHZHiL9W5dCbI4BHEaE9Oeke9cmm3XPv_U4yzM-dPJtYEPceeFK6nB6O6GgH4_mDdmTmkJ_6T8_g6hxkO4U1v7Y1Ew56VUt-xu-8Hn5EMkjKD5anhQh7nczCj1i5QQ4rKhyW-3-Z-3-SpSck4sAT18rNjD78j8pXxcDV69q1QWCyGorNbvI',
    almacenId: 1,
    estanteriaId: 3,
    cajaId: 6,
    stockMinimo: 15,
    valorUnitario: 75,
    createdAt: '2026-04-01',
    updatedAt: '2026-08-24'
  }
];

export const INITIAL_REMISIONES: Remision[] = [
  {
    id: 1,
    numeroRemision: 'REM-2026-0042',
    proyectoId: 1,
    proyectoNombre: 'Granja Solar La Dorada',
    cliente: 'EcoEnergía Andina',
    ubicacion: 'Lote 4B, Vía Nacional 45, La Dorada, Caldas',
    entregadoPor: 'Carlos Ramírez',
    cargoEntregado: 'Jefe de Bodega Central',
    recibidoPor: 'Ing. Marta López',
    cargoRecibido: 'Coordinadora de Proyecto',
    observaciones: 'Material despachado en óptimas condiciones. Se requiere montacargas en sitio para descarga de paneles.',
    fecha: '15 Oct 2026',
    items: [
      { elementoId: 2, codigo: 'PAN450', nombre: 'Panel Solar 450W Monocristalino', cantidad: 120, unidad: 'und' },
      { elementoId: 5, codigo: 'INV042', nombre: 'Inversor String 5kW Trifásico', cantidad: 4, unidad: 'und' },
      { elementoId: 10, codigo: 'CAB400', nombre: 'Rollo Cable Solar 4mm² Negro (100m)', cantidad: 15, unidad: 'rll' }
    ]
  },
  {
    id: 2,
    numeroRemision: 'REM-2026-0041',
    proyectoId: 2,
    proyectoNombre: 'Techo Industrial Bavaria',
    cliente: 'Cervecería Bavaria S.A.',
    ubicacion: 'Parque Industrial Tocancipá, Cundinamarca',
    entregadoPor: 'Carlos Ramírez',
    cargoEntregado: 'Jefe de Bodega Central',
    recibidoPor: 'Ing. Luis Gómez',
    cargoRecibido: 'Residente de Obra',
    observaciones: 'Despacho urgente para montaje de inversores en nave principal.',
    fecha: '10 Oct 2026',
    items: [
      { elementoId: 4, codigo: 'INV050', nombre: 'Inversor String 50kW Tri', cantidad: 2, unidad: 'und' },
      { elementoId: 8, codigo: 'CON004', nombre: 'Conector MC4 Macho / Hembra 1500V', cantidad: 50, unidad: 'par' }
    ]
  },
  {
    id: 3,
    numeroRemision: 'REM-2026-0040',
    proyectoId: 4,
    proyectoNombre: 'Parque Solar Girasol (Fase II)',
    cliente: 'Consorcio Solar del Valle',
    ubicacion: 'Km 12 Vía Yumbo, Valle del Cauca',
    entregadoPor: 'Carlos Ramírez',
    cargoEntregado: 'Jefe de Bodega Central',
    recibidoPor: 'Ing. Carlos Mendoza',
    cargoRecibido: 'Director Técnico',
    observaciones: 'Primer lote de paneles 550W para strings zona norte.',
    fecha: '05 Oct 2026',
    items: [
      { elementoId: 1, codigo: 'PAN550', nombre: 'Panel Solar Monocristalino 550W', cantidad: 120, unidad: 'und' }
    ]
  }
];

export const INITIAL_HISTORIAL: HistorialMovimiento[] = [
  {
    id: 1,
    tipo: 'SALIDA',
    elementoId: 1,
    itemCode: 'PAN550',
    itemName: 'Panel Solar Monocristalino 550W Tier 1',
    proyectoId: 4,
    proyectoNombre: 'Parque Solar Girasol (Fase II)',
    remisionId: 3,
    remisionNumero: 'REM-2026-0040',
    cantidad: 120,
    unidad: 'und',
    stockAnterior: 244,
    stockNuevo: 124,
    motivo: 'Despacho según cronograma de obra',
    responsable: 'Ing. Carlos Mendoza',
    fecha: '15 Oct 2026',
    hora: '08:30 AM',
    docType: 'pdf'
  },
  {
    id: 2,
    tipo: 'ENTRADA',
    elementoId: 3,
    itemCode: 'INV100',
    itemName: 'Inversor Huawei SUN2000-100KTL Smart String',
    proyectoId: undefined,
    proyectoNombre: 'Bodega Central (Recepción)',
    cantidad: 5,
    unidad: 'und',
    stockAnterior: 0,
    stockNuevo: 5,
    motivo: 'Importación embarque marítimo CN-994',
    responsable: 'Ana Ramírez (Almacén)',
    fecha: '14 Oct 2026',
    hora: '14:15 PM',
    docType: 'receipt'
  },
  {
    id: 3,
    tipo: 'AJUSTE',
    elementoId: 8,
    itemCode: 'CON004',
    itemName: 'Conector MC4 Macho Estandar 1500V',
    proyectoId: undefined,
    proyectoNombre: 'Inventario Físico Octubre',
    cantidad: -12,
    unidad: 'par',
    stockAnterior: 462,
    stockNuevo: 450,
    motivo: 'Diferencia en conteo físico cíclico',
    responsable: 'Auditoría Interna',
    fecha: '12 Oct 2026',
    hora: '09:00 AM',
    docType: 'view'
  },
  {
    id: 4,
    tipo: 'SALIDA',
    elementoId: 7,
    itemCode: 'CAB500',
    itemName: 'Cable Solar 6mm² Negro Rollo 500m',
    proyectoId: 5,
    proyectoNombre: 'Proyecto Techo Industrial Norte',
    remisionId: 2,
    remisionNumero: 'REM-2026-0041',
    cantidad: 3,
    unidad: 'rll',
    stockAnterior: 3,
    stockNuevo: 0,
    motivo: 'Despacho para acometida principal',
    responsable: 'Ing. Luis Gómez',
    fecha: '10 Oct 2026',
    hora: '16:45 PM',
    docType: 'pdf'
  },
  {
    id: 5,
    tipo: 'ENTRADA',
    elementoId: 2,
    itemCode: 'PAN450',
    itemName: 'Panel Solar 450W Monocristalino Jinko',
    proyectoId: undefined,
    proyectoNombre: 'Bodega Central (Recepción)',
    cantidad: 150,
    unidad: 'und',
    stockAnterior: 112,
    stockNuevo: 262,
    motivo: 'Recepción orden de compra OC-8821',
    responsable: 'Carlos Ramírez',
    fecha: '08 Oct 2026',
    hora: '11:20 AM',
    docType: 'receipt'
  }
];
