import React from 'react';
import { STEPS } from '../constants';
import { ChevronRight, ChevronLeft, X, LayoutDashboard, Check } from 'lucide-react';

interface LayoutProps {
  currentStep: number;
  children: React.ReactNode;
  onNext: () => void;
  onBack: () => void;
  onStepClick: (stepId: number) => void;
  canNext: boolean;
  onExit: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ currentStep, children, onNext, onBack, onStepClick, canNext, onExit }) => {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 shadow-2xl z-20">
        {/* Brand Area */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-blue-900/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
           </div>
           <span className="font-bold text-lg tracking-tight text-slate-100">Acme Analytics</span>
        </div>

        {/* Vertical Stepper */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
            <div className="px-3 mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Configuration Wizard
            </div>
            {STEPS.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                const isClickable = step.id <= currentStep;
                
                return (
                    <button 
                        key={step.id}
                        disabled={!isClickable}
                        onClick={() => isClickable && onStepClick(step.id)}
                        className={`group w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 relative text-left
                            ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}
                            ${isCompleted ? 'text-blue-200 hover:bg-slate-800 hover:text-white cursor-pointer' : ''}
                            ${!isClickable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                        `}
                    >
                        {/* Connecting Line */}
                        {index !== STEPS.length - 1 && (
                            <div className={`absolute left-[27px] top-10 bottom-0 w-0.5 h-6 z-0
                                ${isCompleted ? 'bg-blue-800' : 'bg-slate-800'}
                            `} />
                        )}

                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mr-3 border-2 transition-colors
                            ${isActive ? 'bg-white text-blue-600 border-white' : ''}
                            ${isCompleted ? 'bg-blue-900 border-blue-700 text-blue-300 group-hover:bg-blue-800' : ''}
                            ${!isActive && !isCompleted ? 'bg-slate-800 border-slate-700 text-slate-500' : ''}
                        `}>
                            {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                        </div>
                        
                        <div className="flex flex-col">
                            <span className={`text-sm font-medium ${isActive ? 'text-white' : ''} ${isCompleted ? 'text-blue-100 group-hover:text-white' : ''}`}>
                                {step.title}
                            </span>
                            {isActive && <span className="text-[10px] text-blue-200 font-normal">In Progress</span>}
                        </div>
                    </button>
                );
            })}
        </div>

        {/* Footer Actions in Sidebar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
            <button 
                onClick={onExit}
                className="flex items-center w-full px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
                <X className="w-4 h-4 mr-3" />
                Exit Wizard
            </button>
        </div>
      </aside>

      {/* RIGHT CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50/50">
         {/* Top Header */}
         <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-10">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
                {currentStep === 4 ? 'Export Analysis' : STEPS[currentStep - 1].title}
            </h2>
            <div className="flex items-center space-x-4 text-sm text-slate-500">
                <span className="flex items-center px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                    <LayoutDashboard className="w-3.5 h-3.5 mr-2 text-slate-400" />
                    Draft Mode
                </span>
            </div>
         </header>

         {/* Scrollable Step Content */}
         <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
            <div className={`mx-auto h-full ${currentStep === 3 ? 'max-w-none' : 'max-w-6xl'}`}>
                {children}
            </div>
         </div>

         {/* Bottom Navigation Bar */}
         <footer className="h-20 bg-white border-t border-slate-200 px-8 flex items-center justify-between flex-shrink-0 z-10 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
            <button 
                onClick={onBack}
                className={`flex items-center px-6 py-2.5 rounded-lg border text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-slate-200
                    ${currentStep === 1 
                        ? 'border-transparent text-slate-400 hover:bg-slate-50' 
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900'}`}
            >
                <ChevronLeft className={`w-4 h-4 mr-2 ${currentStep === 1 ? 'hidden' : ''}`} />
                {currentStep === 1 ? 'Cancel Analysis' : 'Back'}
            </button>
            
            <button 
                // Fix: Use onNext instead of handleNext as defined in props
                onClick={onNext}
                disabled={!canNext}
                className={`flex items-center px-8 py-3 rounded-lg text-sm font-bold transition-all shadow-lg transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600
                    ${!canNext
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-600/25'}`}
            >
                {currentStep === STEPS.length ? 'Finish & Download' : 'Continue'}
                {currentStep !== STEPS.length && <ChevronRight className="ml-2 w-4 h-4" />}
            </button>
         </footer>
      </main>
    </div>
  );
};