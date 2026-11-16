'use client';

import { useState } from 'react';
import { X, User, Mail, Shield, Key, FileText, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { updateAdminProfileApi } from '../lib/api';

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    professional?: {
      id: string;
      name: string;
      bio?: string | null;
      services?: any[];
    } | null;
  } | null;
  token?: string;
  onProfileUpdated: (updatedUser: any) => void;
}

export function AdminProfileModal({
  isOpen,
  onClose,
  currentUser,
  token,
  onProfileUpdated
}: AdminProfileModalProps) {
  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.professional?.bio || '');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('El nombre no puede estar vacío');
      return;
    }

    if (showPasswordChange) {
      if (!currentPassword) {
        setError('Debe ingresar su contraseña actual para cambiarla');
        return;
      }
      if (newPassword.length < 6) {
        setError('La nueva contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        bio: bio.trim()
      };

      if (showPasswordChange && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await updateAdminProfileApi(payload, token);
      setSuccess('Perfil actualizado exitosamente');
      onProfileUpdated({
        ...currentUser,
        name: res.user?.name || name,
        professional: currentUser?.professional ? {
          ...currentUser.professional,
          name: res.user?.name || name,
          bio
        } : null
      });

      if (showPasswordChange) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordChange(false);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-pretty-wine-950/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/80 my-auto text-pretty-wine-900">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/70 hover:bg-white text-pretty-wine-800 transition-colors shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center space-x-3 mb-6 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pretty-wine-900 to-pretty-pink-500 text-white flex items-center justify-center font-serif text-lg font-bold shadow-md flex-shrink-0">
            {currentUser.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-pretty-wine-900">
                Mi Perfil
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-pretty-pink-100 text-pretty-wine-900 border border-pretty-pink-200">
                {currentUser.role === 'OWNER' ? 'Propietaria' : 'Esteticista'}
              </span>
            </div>
            <p className="text-xs text-pretty-wine-700/80">
              {currentUser.email}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50/90 border border-red-200 flex items-center space-x-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-center space-x-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-pretty-wine-800 mb-1">
              Nombre Completo:
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-pretty-wine-600/60" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-pretty-wine-800 mb-1">
              Correo Electrónico (identificador de acceso):
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-pretty-wine-600/60" />
              <input
                type="email"
                value={currentUser.email}
                disabled
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-pretty-pink-200/50 bg-pretty-pink-50/50 text-xs text-pretty-wine-700/60 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-pretty-wine-800 mb-1">
              Biografía / Presentación en el Salón:
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-pretty-wine-600/60" />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Especialista en técnicas rusas, peinados..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-pretty-pink-200 bg-white text-xs font-medium focus:ring-1 focus:ring-pretty-pink-400 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Toggle para cambiar contraseña */}
          <div className="pt-2 border-t border-pretty-pink-200/40">
            <button
              type="button"
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="text-xs font-semibold text-pretty-pink-600 hover:text-pretty-wine-900 transition-colors flex items-center space-x-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{showPasswordChange ? 'Cancelar cambio de contraseña' : 'Cambiar mi contraseña'}</span>
            </button>

            {showPasswordChange && (
              <div className="mt-3 space-y-3 p-3.5 rounded-2xl bg-pretty-pink-50/50 border border-pretty-pink-200/60">
                <div>
                  <label className="block text-[11px] font-semibold text-pretty-wine-800 mb-1">
                    Contraseña actual:
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-9 px-3 rounded-xl border border-pretty-pink-200 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-pretty-wine-800 mb-1">
                    Nueva contraseña (mínimo 6 caracteres):
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-9 px-3 rounded-xl border border-pretty-pink-200 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-pretty-wine-800 mb-1">
                    Confirmar nueva contraseña:
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-9 px-3 rounded-xl border border-pretty-pink-200 bg-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-pretty-wine-800 hover:bg-white/60 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-pretty-wine-900 hover:bg-pretty-pink-600 transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
