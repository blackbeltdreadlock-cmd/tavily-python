import type { BotExportData } from '@/stores/importExportStore';

export function generateExportJson(data: BotExportData): string {
  return JSON.stringify(data, null, 2);
}

export function validateImportJson(jsonString: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const data = JSON.parse(jsonString) as BotExportData;

    // Check required fields
    if (!data.bot) {
      errors.push('Falta campo "bot" no arquivo');
    } else {
      if (!data.bot.name || typeof data.bot.name !== 'string') {
        errors.push('Campo "bot.name" é obrigatório e deve ser string');
      }
      if (!data.bot.system_prompt || typeof data.bot.system_prompt !== 'string') {
        errors.push('Campo "bot.system_prompt" é obrigatório e deve ser string');
      }
      if (!data.bot.model || typeof data.bot.model !== 'string') {
        errors.push('Campo "bot.model" é obrigatório e deve ser string');
      }
    }

    // Check optional knowledge array
    if (data.knowledge && !Array.isArray(data.knowledge)) {
      errors.push('Campo "knowledge" deve ser um array');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: ['JSON inválido: ' + (error instanceof Error ? error.message : 'Erro desconhecido')],
    };
  }
}

export function downloadJson(json: string, filename: string): void {
  // Create blob and trigger download
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function validateFileSize(sizeInBytes: number, maxMB: number = 50): boolean {
  return sizeInBytes <= maxMB * 1024 * 1024;
}
