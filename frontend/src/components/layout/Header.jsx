// Dashboard top header

import Icon from "../common/Icon";

function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <div className="lg:hidden">
          <div className="text-lg font-bold tracking-tight text-slate-950">
            TEJO<span className="text-blue-600">.</span>
          </div>
        </div>

        <div className="hidden h-10 w-px bg-slate-200 lg:block" />

        <div className="relative hidden w-[320px] md:block">
          <Icon
            name="search"
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search customers, calls..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <div className="text-sm font-semibold text-slate-900">
            Prajwal
          </div>
          <div className="text-xs text-slate-400">Administrator</div>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
          P
        </div>
      </div>
    </header>
  );
}

export default Header;