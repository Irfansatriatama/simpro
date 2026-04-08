'use server';

import { revalidatePath } from 'next/cache';
import {
  currencySymbolForCode,
  SETTINGS_CURRENCIES,
  SETTINGS_DATE_FORMATS,
  SETTINGS_TIMEZONES,
} from '@/lib/settings-constants';
import { requireManagementSession } from '@/lib/management-auth';
import { prisma } from '@/lib/prisma';

export type SettingsActionResult = { ok: true } | { ok: false; error: string };

function trim(s: FormDataEntryValue | null): string {
  return String(s ?? '').trim();
}

export async function updateOrgSettingsAction(
  formData: FormData,
): Promise<SettingsActionResult> {
  if (!(await requireManagementSession())) {
    return { ok: false, error: 'Hanya administrator atau PM.' };
  }

  const systemName = trim(formData.get('system_name'));
  if (!systemName || systemName.length < 2) {
    return { ok: false, error: 'Nama sistem minimal 2 karakter.' };
  }
  if (systemName.length > 120) {
    return { ok: false, error: 'Nama sistem terlalu panjang.' };
  }

  const timezone = trim(formData.get('timezone')) || 'Asia/Jakarta';
  if (!(SETTINGS_TIMEZONES as readonly string[]).includes(timezone)) {
    return { ok: false, error: 'Zona waktu tidak valid.' };
  }

  const dateFormat = trim(formData.get('date_format')) || 'DD MMM YYYY';
  if (!(SETTINGS_DATE_FORMATS as readonly string[]).includes(dateFormat)) {
    return { ok: false, error: 'Format tanggal tidak valid.' };
  }

  const currency = trim(formData.get('currency')) || 'IDR';
  if (!SETTINGS_CURRENCIES.some((c) => c.code === currency)) {
    return { ok: false, error: 'Mata uang tidak valid.' };
  }
  const currencySymbol = currencySymbolForCode(currency);

  const hourlyRaw = trim(formData.get('hourly_rate'));
  const hourly = hourlyRaw === '' ? 0 : Number(hourlyRaw.replace(',', '.'));
  if (!Number.isFinite(hourly) || hourly < 0) {
    return { ok: false, error: 'Tarif per jam tidak valid.' };
  }

  const taxRaw = trim(formData.get('tax_rate'));
  const tax = taxRaw === '' ? 0 : Number(taxRaw.replace(',', '.'));
  if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
    return { ok: false, error: 'Pajak (%) harus antara 0 dan 100.' };
  }

  const pairs: [string, string][] = [
    ['system_name', systemName],
    ['timezone', timezone],
    ['date_format', dateFormat],
    ['currency', currency],
    ['currency_symbol', currencySymbol],
    ['hourly_rate', String(hourly)],
    ['tax_rate', String(tax)],
  ];

  try {
    await prisma.$transaction(
      pairs.map(([key, value]) =>
        prisma.settings.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );
    revalidatePath('/settings');
    revalidatePath('/dashboard', 'layout');
    revalidatePath('/projects', 'layout');
    revalidatePath('/clients', 'layout');
    revalidatePath('/members', 'layout');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menyimpan pengaturan.' };
  }
}
