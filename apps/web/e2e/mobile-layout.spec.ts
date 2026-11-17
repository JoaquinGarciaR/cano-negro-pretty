import { test, expect } from '@playwright/test';

test.describe('Caño Negro Pretty - Mobile Layout & Responsiveness (iPhone 14 Viewport)', () => {
  
  test('Landing page has no horizontal overflow on mobile and displays PWA install button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 1. Verificar que no haya overflow horizontal en la ventana móvil (390px)
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing).toBe(false);

    // 2. Verificar que el brand del salón esté visible
    await expect(page.locator('text=Caño Negro Pretty').first()).toBeVisible();

    // 3. Verificar botón de Instalar App en el header
    const installBtn = page.locator('header button:has-text("Instalar")');
    await expect(installBtn).toBeVisible();

    // 4. Abrir modal de instalación PWA
    await installBtn.click({ force: true });
    await expect(page.locator('text=Instalar Caño Negro Pretty')).toBeVisible();
    await expect(page.locator('button:has-text("Chrome (iOS)")')).toBeVisible();
    await expect(page.locator('button:has-text("Safari (iOS)")')).toBeVisible();
    await expect(page.locator('button:has-text("Android")')).toBeVisible();

    // 5. Cerrar modal con el botón X
    const closeBtn = page.locator('.fixed button:has(svg)').first();
    await closeBtn.click({ force: true });
  });

  test('Public Booking Wizard allows unassigned specialist flow, Costa Rica +506 default and strictly 8-digit phone', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Abrir Wizard de Reserva desde el botón principal o navbar
    const bookBtn = page.locator('button:has-text("Reservar mi Cita")').first();
    await bookBtn.click({ force: true });

    // Paso 1: Seleccionar un servicio dentro del modal
    await expect(page.locator('h3:has-text("Selecciona tu Servicio")')).toBeVisible();
    const serviceCard = page.locator('.fixed .max-w-lg h5').first();
    await serviceCard.click({ force: true });

    // Paso 2: Modalidad de atención (la clienta no elige especialista; el salón asigna al confirmar)
    const nextBtn = page.locator('.fixed button:has-text("Siguiente")');
    await nextBtn.click({ force: true });
    await expect(page.locator('h3:has-text("Modalidad de Atención")')).toBeVisible();
    await expect(page.getByText('En estación', { exact: true })).toBeVisible();

    // Paso 3: Fecha y hora disponible
    await nextBtn.click({ force: true });
    await expect(page.locator('h3:has-text("Fecha y Hora Disponible")')).toBeVisible();

    // Seleccionar un día desbloqueado a futuro si existe para tener turnos libres garantizados
    const unlockedDays = page.locator('.fixed button:not([disabled])').filter({ hasText: /^\d+$/ });
    const countDays = await unlockedDays.count();
    if (countDays > 1) {
      // Elegir un día posterior para evitar horarios pasados de hoy
      await unlockedDays.nth(1).click({ force: true }).catch(() => {});
    } else if (countDays === 1) {
      await unlockedDays.first().click({ force: true }).catch(() => {});
    }

    // Esperar a que se carguen los turnos y seleccionar uno libre
    const slotBtn = page.locator('.fixed button[title^="Turno libre:"]').first();
    const hasSlot = await slotBtn.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
    
    if (hasSlot) {
      await slotBtn.click({ force: true });
      await nextBtn.click({ force: true });

      // Paso 4: Datos de contacto y validación de teléfono 8 dígitos
      await expect(page.locator('h3:has-text("Tus Datos de Contacto")')).toBeVisible();

      // Verificar que el selector de código de país tenga +506 por defecto
      const countrySelect = page.locator('.fixed select').first();
      await expect(countrySelect).toHaveValue('+506');

      // Probar validación de teléfono con menos de 8 dígitos
      const phoneInput = page.locator('.fixed input[type="tel"]');
      await phoneInput.fill('8888');
      await expect(page.locator('text=Faltan 4 dígitos')).toBeVisible();

      // Probar que si el usuario escribe o pega con código de país (ej: +506 8888 7777), se limpie automáticamente
      await phoneInput.fill('+506 8888 7777');
      await expect(phoneInput).toHaveValue('88887777');
      await expect(page.locator('text=Número telefónico válido (+506 88887777)')).toBeVisible();

      // Llenar nombre de clienta
      const nameInput = page.locator('.fixed input[placeholder*="Mariana"]').first();
      await nameInput.fill('Clienta Playwright Test');

      // Aceptar política
      const policyCheckbox = page.locator('.fixed input[type="checkbox"]#policy');
      await policyCheckbox.check({ force: true });

      // Paso 5: Resumen y confirmación (verifica que la asignación es por bandeja general)
      await nextBtn.click({ force: true });
      await expect(page.locator('h3:has-text("Revisa y Confirma")')).toBeVisible();
      await expect(page.locator('text=+506 88887777')).toBeVisible();
      await expect(page.locator('text=Bandeja general')).toBeVisible();
    }
  });

  test('Admin Backoffice mobile layout, manual booking modal, and dual agenda view toggle', async ({ page }) => {
    // Ir al login administrativo
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    // Login con credenciales reales de seed
    await page.fill('input[type="email"]', 'admin@canonegropretty.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Esperar redirección al dashboard
    await page.waitForURL('**/admin', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // 1. Verificar que en mobile no haya desborde horizontal en el backoffice
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing).toBe(false);

    // 2. Verificar presencia del botón para ingresar cita manual
    const manualBtn = page.locator('header button:has-text("Cita")').first();
    await expect(manualBtn).toBeVisible();

    // 3. Abrir Modal de Cita Manual y verificar selección de bloque de inicio
    await manualBtn.click({ force: true });
    await expect(page.getByRole('heading', { name: 'Ingresar Cita Manual' })).toBeVisible();

    await page.fill('input[placeholder*="Sofía Chaves"]', 'Mariana Manual Playwright');
    await page.fill('input[placeholder*="8888-8888"], input[placeholder*="88887777"]', '88889999');

    // Verificar que el selector estricto de bloques de 15 min esté activo (sin input type="time" libre)
    await expect(page.locator('label:has-text("Bloque de Inicio:")')).toBeVisible();

    // Seleccionar un turno libre en la cuadrícula de 15 minutos si existe para la fecha
    const slotBtn = page.locator('button[data-available="true"]').filter({ hasText: /^\d{2}:\d{2}$/ }).first();
    if (await slotBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await slotBtn.click({ force: true });
      await page.click('button:has-text("Confirmar Cita")');
      await expect(page.getByRole('heading', { name: 'Ingresar Cita Manual' })).not.toBeVisible({ timeout: 10000 });

      // Verificar que tras crear la cita con éxito, el formulario se haya limpiado
      await manualBtn.click({ force: true });
      await expect(page.locator('input[placeholder*="Sofía Chaves"]')).toHaveValue('');
      await page.click('button:has-text("Cancelar")');
    } else {
      // Si la fecha actual no tiene turnos libres, probar preservación y botón de limpiar borrador
      await page.click('button:has-text("Cancelar")');
      await manualBtn.click({ force: true });
      await expect(page.locator('input[placeholder*="Sofía Chaves"]')).toHaveValue('Mariana Manual Playwright');
      await page.click('button:has-text("Limpiar formulario")');
      await expect(page.locator('input[placeholder*="Sofía Chaves"]')).toHaveValue('');
      await page.click('button:has-text("Cancelar")');
    }
    await expect(page.getByRole('heading', { name: 'Ingresar Cita Manual' })).not.toBeVisible({ timeout: 10000 });

    // 4. Cambiar a la pestaña de Agenda & Calendario
    await page.click('button:has-text("Agenda")');
    await expect(page.locator('text=Agenda del Salón')).toBeVisible();

    // 5. Verificar presencia del toggle de subvistas: Calendario Visual y Lista por Rango
    const calendarToggleBtn = page.locator('button:has-text("Calendario Visual")');
    const listToggleBtn = page.locator('button:has-text("Lista por Rango")');
    await expect(calendarToggleBtn).toBeVisible();
    await expect(listToggleBtn).toBeVisible();

    // 6. Cambiar a la Vista Lista por Rango
    await listToggleBtn.click();
    await expect(page.locator('label:has-text("Fecha Inicio:")')).toBeVisible();
    await expect(page.locator('label:has-text("Fecha Fin:")')).toBeVisible();
    await expect(page.locator('input[placeholder*="Clienta o servicio"]')).toBeVisible();

    // 7. Verificar que la Propietaria cuenta con selector estilizado de estilista y ve todas las citas por defecto
    const ownerStylistFilter = page.locator('button[title*="Filtrar agenda por estilista"]').first();
    await expect(ownerStylistFilter).toBeVisible();
    await expect(ownerStylistFilter).toContainText('Todas las Estilistas');

    // Probar apertura del popover con estilo Pretty Salon
    await ownerStylistFilter.click();
    await expect(page.locator('text=Filtrar Citas del Salón')).toBeVisible();
    await expect(page.locator('button:has-text("Sin asignar")').first()).toBeVisible();
    await ownerStylistFilter.click(); // Cerrar popover

    // 8. Regresar al Calendario Visual y verificar cuadrícula
    await calendarToggleBtn.click();
    await expect(page.locator('div:has-text("Dom")').first()).toBeVisible();

    // 9. Regresar a Solicitudes y verificar dropdown estilizado de filtro para la propietaria
    await page.click('button:has-text("Solicitudes")');
    await expect(page.locator('text=Filtrar bandeja:')).toBeVisible();
    const bandejaDropdown = page.locator('button[title*="Filtrar solicitudes"]').first();
    await expect(bandejaDropdown).toBeVisible();
    await expect(bandejaDropdown).toContainText('Todas las solicitudes');
    await bandejaDropdown.click();
    await expect(page.locator('button:has-text("Sin asignar")').first()).toBeVisible();
    await bandejaDropdown.click(); // Cerrar dropdown
  });

  test('Direct catalog anchor navigation and /catalogo redirect', async ({ page }) => {
    // 1. Navegar directamente con la etiqueta #catalogo
    await page.goto('/#catalogo');
    await page.waitForLoadState('networkidle');

    // Verificar que la sección del catálogo esté visible
    const catalogHeading = page.getByRole('heading', { name: 'Catálogo de Servicios & Paquetes' });
    await expect(catalogHeading).toBeVisible();

    // 2. Verificar el botón de copiar enlace al catálogo
    const copyCatalogBtn = page.locator('button:has-text("Copiar enlace al catálogo")');
    await expect(copyCatalogBtn).toBeVisible();

    // 3. Probar la ruta directa amigable /catalogo
    await page.goto('/catalogo');
    await page.waitForURL('**/#catalogo');
    await expect(catalogHeading).toBeVisible();

    // 4. Verificar que las etiquetas de Combo Especial no se solapan con el título del paquete
    const comboBadge = page.locator('span:has-text("Combo Especial")').first();
    const comboTitle = page.locator('h4:has-text("Combo Mirada & Manos Pretty")').first();
    if (await comboBadge.isVisible()) {
      const badgeBox = await comboBadge.boundingBox();
      const titleBox = await comboTitle.boundingBox();
      expect(badgeBox).not.toBeNull();
      expect(titleBox).not.toBeNull();
      if (badgeBox && titleBox) {
        // Verificar que no haya colisión o solapamiento geométrico entre el título y la etiqueta
        const hasOverlap = !(
          titleBox.x + titleBox.width <= badgeBox.x ||
          badgeBox.x + badgeBox.width <= titleBox.x ||
          titleBox.y + titleBox.height <= badgeBox.y ||
          badgeBox.y + badgeBox.height <= titleBox.y
        );
        expect(hasOverlap).toBe(false);
      }
    }
  });

  test('Admin Menu Drawer provides Profile and Service Management modals', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'admin@canonegropretty.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // 1. Abrir Menú Drawer
    const menuBtn = page.locator('header button[title*="Menú"], header button:has-text("Menú")').first();
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // 2. Verificar opciones del menú
    await expect(page.locator('button:has-text("Mi Cuenta & Perfil")')).toBeVisible();
    await expect(page.locator('button:has-text("Gestión de Servicios")')).toBeVisible();

    // 3. Abrir Modal de Mi Cuenta / Perfil
    await page.click('button:has-text("Mi Cuenta & Perfil")');
    await expect(page.getByRole('heading', { name: 'Mi Perfil' })).toBeVisible();
    const closeBtn = page.locator('.fixed button:has(svg)').first();
    await closeBtn.click({ force: true });

    // 4. Reabrir menú y abrir Gestión de Servicios
    await menuBtn.click();
    await page.click('button:has-text("Gestión de Servicios")');
    await expect(page.getByRole('heading', { name: 'Servicios del Salón' })).toBeVisible();
    await expect(page.locator('button:has-text("Nuevo Servicio")')).toBeVisible();

    // 5. Verificar Dropdown de Categorías con barra de búsqueda interna
    const catDropdownBtn = page.locator('button:has-text("Todas las categorías")');
    await expect(catDropdownBtn).toBeVisible();
    await catDropdownBtn.click();
    const catSearchInput = page.locator('input[placeholder="Buscar categoría..."]');
    await expect(catSearchInput).toBeVisible();
    await catSearchInput.fill('Uñ');
    const unasOption = page.locator('.space-y-1 button:has-text("Uñas")').first();
    await expect(unasOption).toBeVisible();
    await unasOption.click();
    await expect(page.locator('button:has-text("Uñas")').first()).toBeVisible();
  });

});
