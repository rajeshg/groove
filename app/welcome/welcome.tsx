export function Welcome() {
   return (
     <main className="flex items-center justify-center pt-16 pb-4">
       <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
         <header className="flex flex-col items-center gap-9">
           <div className="flex flex-col items-center gap-6">
             <div className="w-32 h-32 relative">
               <img
                 src="/logo-light.svg"
                 alt="Groove Logo"
                 className="block w-full h-full dark:hidden"
               />
               <img
                 src="/logo-dark.svg"
                 alt="Groove Logo"
                 className="hidden w-full h-full dark:block"
               />
            </div>
            <h1 className="text-6xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">
              Groove
            </h1>
            <p className="text-xl text-slate-500 dark:text-slate-400 font-medium text-center max-w-lg">
              Find your rhythm. Organize your projects with the refined flow of
              a professional kanban.
            </p>
          </div>
        </header>
      </div>
    </main>
  );
}
