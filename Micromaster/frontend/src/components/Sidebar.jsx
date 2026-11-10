import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SIDEBAR_MENU } from '../constants/sidebarMenu';
import { admin } from '../services/api';
import AppIcon, { MicroMasterLogo } from './AppIcon';

export default function Sidebar({ user, sidebarOpen, onToggle, onLogout }) {
  const role = user?.role || 'ADMINISTRADOR';
  const menu = SIDEBAR_MENU[role] || [];
  const location = useLocation();

  const sectionFor = (pathname) =>
    menu.find((s) => s.items.some((it) => it.to === pathname));

  const activeSection = sectionFor(location.pathname);
  const [openId, setOpenId] = useState(activeSection?.id || (menu.length > 0 ? menu[0].id : null));
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  useEffect(() => {
    if (activeSection) setOpenId(activeSection.id);
  }, [location.pathname]);

  useEffect(() => {
    if (role === 'ADMINISTRADOR') {
      admin.getPendingUsers()
        .then((res) => {
          setPendingUsersCount(res.data?.pending ?? (res.data?.users || []).length);
        })
        .catch(() => {});
    }
  }, [role, location.pathname]);

  if (menu.length === 0) return null;

  const toggle = (id) => setOpenId((cur) => (cur === id ? null : id));

  const isActive = (item) => item.to === location.pathname;

  return (
    <aside
      className={`fixed left-0 top-0 h-dvh w-[268px] max-w-[85vw] md:w-64 md:max-w-none bg-slate-900 text-white z-50 flex flex-col border-r border-white/10 transition-transform duration-200 will-change-transform pt-safe pb-safe ${
        sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0 lg:shadow-none'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <MicroMasterLogo size={38} />
          <div className="min-w-0">
            <span className="text-sm font-black tracking-tight block leading-none">
              MICRO<span className="text-lime-400">MASTER</span>
            </span>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/45 block mt-0.5">
              Planta & Frío B2B
            </span>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="lg:hidden shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60 active:bg-white/15 btn-press transition-colors"
          title="Cerrar menú"
          aria-label="Cerrar menú"
        >
          <AppIcon name="x-lg" size={15} />
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2.5 py-3 space-y-1.5">
        {menu.map((section) => {
          const open = openId === section.id;
          const sectionHasPending = section.id === 'administracion' && pendingUsersCount > 0;

          return (
            <div key={section.id} className="rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(section.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-mono text-[10px] text-lime-400/80 shrink-0">{section.num}</span>
                <span className="flex-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/65 flex items-center gap-1.5">
                  {section.label}
                  {sectionHasPending && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black bg-amber-400 text-slate-900">
                      {pendingUsersCount}
                    </span>
                  )}
                </span>
                <span
                  className={`text-lime-400/80 transition-transform duration-150 ${
                    open ? 'rotate-90' : ''
                  }`}
                >
                  <AppIcon name="chevron-right" size={13} strokeWidth={2.2} />
                </span>
              </button>

              {open && (
                <div className="px-1.5 pb-2 space-y-0.5 animate-fade-in">
                  {section.items.map((item) => {
                    const active = isActive(item);
                    const itemIsPendingTarget = item.to === '/settings' && pendingUsersCount > 0;

                    return (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={() => {
                          if (window.innerWidth < 1024) onToggle();
                        }}
                        className={`group flex items-start gap-2.5 px-2.5 py-2 rounded-xl btn-press transition-colors ${
                          active
                            ? 'bg-lime-400 text-slate-900 shadow-sm'
                            : 'text-white/75 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className={`mt-0.5 shrink-0 ${active ? 'text-slate-900' : 'text-lime-400'}`}>
                          <AppIcon name={item.icon} size={15} strokeWidth={active ? 2.1 : 1.75} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-1.5">
                            <span className="block text-[11px] font-bold uppercase tracking-[0.08em] leading-tight truncate">
                              {item.label}
                            </span>
                            {itemIsPendingTarget && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-amber-400 text-slate-900 shrink-0 shadow-xs">
                                {pendingUsersCount}
                              </span>
                            )}
                          </span>
                          <span
                            className={`block text-[10px] leading-tight mt-0.5 truncate ${
                              active ? 'text-slate-900/75 font-medium' : 'text-white/40 group-hover:text-white/60'
                            }`}
                          >
                            {item.desc}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-2.5 border-t border-white/10 bg-slate-900 shrink-0">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/5">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-lime-400/40 flex items-center justify-center text-xs font-mono font-black text-lime-400 shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate leading-tight">
              {user?.name ? user.name.replace(/Palehor/gi, 'Palechor') : 'Usuario'}
            </p>
            <p className="text-[9px] font-mono text-lime-400 uppercase tracking-wider truncate leading-tight mt-0.5">
              {user?.role_label}
            </p>
          </div>
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 hover:text-red-400 text-white/50 btn-press transition-colors"
          >
            <AppIcon name="power" size={14} />
          </button>
        </div>
        <div className="flex items-center justify-between px-1 mt-1.5 text-[9px] font-mono text-white/30 uppercase tracking-widest">
          <span>INVIMA BPM · FEFO</span>
          <span>v2.5 PRO</span>
        </div>
      </div>
    </aside>
  );
}
