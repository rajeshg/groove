import { useLoaderData } from "react-router";
import { requireAuthCookie } from "../auth/auth";
import { getProfileData } from "./queries";
import { Icon } from "../icons/icons";
import { useTheme } from "../context/theme";
import { BoardHeader } from "./board/board-header";

export async function loader({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const profileData = await getProfileData(accountId);
  return profileData;
}

function AppearanceButton({ active, icon, label, onClick }: { active: boolean, icon: string, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
        active 
          ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 shadow-sm ring-2 ring-blue-500/10" 
          : "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
      }`}
    >
      <span className="text-2xl mb-2">
        {icon === 'sun' ? '☀️' : icon === 'moon' ? '🌙' : '🖥️'}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-tighter text-center leading-tight">{label}</span>
    </button>
  );
}

export default function Profile() {
  const { email } = useLoaderData<typeof loader>();
  const { theme, setTheme } = useTheme();

  const initials = email.split("@")[0].substring(0, 2).toUpperCase();
  const displayName = email.split("@")[0].split(".").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <BoardHeader />
      
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
        {/* Centered context indicator */}
        <div className="mb-8 flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <Icon name="user" size="md" />
          <span className="text-xs font-black uppercase tracking-widest">Personal Profile</span>
        </div>

        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left Card: Account Info */}
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 p-10 flex flex-col items-center relative overflow-hidden">
            {/* Edit Icon */}
            <button className="absolute top-8 right-8 p-2 rounded-full border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <Icon name="pencil" size="md" />
            </button>

            {/* Avatar */}
            <div className="w-32 h-32 rounded-full bg-[#c5a87a] flex items-center justify-center text-white text-4xl font-bold mb-6 shadow-inner">
              {initials}
            </div>

            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2 text-center">{displayName}</h1>
            <a href={`mailto:${email}`} className="text-blue-500 hover:underline mb-10 font-medium">
              {email}
            </a>

            <div className="w-full flex flex-col gap-3 mb-12">
              <button className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-[0.98]">
                Which cards are assigned to me?
              </button>
              <button className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-[0.98]">
                Which cards were added by me?
              </button>
            </div>

            <div className="w-full pt-8 border-t border-slate-100 dark:border-slate-700 flex justify-center">
              <form action="/logout" method="post">
                <button className="py-2 px-6 border border-slate-200 dark:border-slate-600 rounded-full text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Sign out of Trellix on this device
                </button>
              </form>
            </div>
          </div>

          {/* Right Card: Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 p-10 flex flex-col gap-10">
            
            {/* Appearance */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700"></div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[13px]">Appearance</h2>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700"></div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <AppearanceButton 
                  active={theme === 'light'} 
                  onClick={() => setTheme('light')}
                  icon="sun" 
                  label="Always light" 
                />
                <AppearanceButton 
                  active={theme === 'dark'} 
                  onClick={() => setTheme('dark')}
                  icon="moon" 
                  label="Always dark" 
                />
                <AppearanceButton 
                  active={theme === 'system'} 
                  onClick={() => setTheme('system')}
                  icon="device-desktop" 
                  label="Same as OS" 
                />
              </div>
            </section>

            {/* Devices */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700"></div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[13px]">Devices</h2>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700"></div>
              </div>
              
              <p className="text-center text-slate-600 dark:text-slate-400 mb-4 text-sm font-medium px-4">
                Link to automatically log in on another device.
              </p>
              
              <div className="flex flex-col items-center gap-4">
                <div className="w-full relative group">
                  <input 
                    readOnly
                    value={`https://trellix.app/session/transfer/r8k3p2`}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-xs text-slate-500 font-mono focus:outline-none"
                  />
                </div>
                
                <div className="flex gap-4">
                  <button className="p-3 rounded-full border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
                    <Icon name="device-qr" size="md" />
                  </button>
                  <button className="p-3 rounded-full border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
                    <Icon name="clipboard" size="md" />
                  </button>
                </div>
              </div>
            </section>

            {/* Developer */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700"></div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[13px]">Developer</h2>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700"></div>
              </div>
              
              <p className="text-center text-slate-600 dark:text-slate-400 text-sm font-medium">
                Manage <button className="text-blue-500 hover:underline">personal access tokens</button> used with the Trellix developer API.
              </p>
            </section>
          </div>
        </div>

        {/* Footer Quote */}
        <div className="mt-16 text-center">
          <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100">What have you been up to?</h3>
        </div>
      </div>
    </div>
  );
}
