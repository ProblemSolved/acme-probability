import React from 'react';
import { SavedQuery } from '../types';
import { Plus, Search, FileText, Clock, Trash2, Edit2, FolderOpen, Filter, BarChart3, Settings, HelpCircle, LogOut, MoreHorizontal } from 'lucide-react';

interface DashboardProps {
    queries: SavedQuery[];
    onCreate: () => void;
    onOpen: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ queries, onCreate, onOpen }) => {
    return (
        <div className="flex h-screen bg-[#faf9f8] font-sans text-slate-900 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-10">
                <div className="h-14 flex items-center px-4 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                         <div className="w-6 h-6 bg-blue-700 text-white flex items-center justify-center rounded-md font-bold text-sm shadow-sm">
                            A
                         </div>
                        <span className="font-semibold text-sm text-slate-800">Acme Analytics</span>
                    </div>
                </div>
                
                <div className="p-3 space-y-1">
                    <button className="w-full flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-md text-sm font-medium">
                        <FolderOpen className="w-4 h-4 mr-3" />
                        My Analysis
                    </button>
                    <button className="w-full flex items-center px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-medium transition-colors">
                        <Clock className="w-4 h-4 mr-3" />
                        Recent
                    </button>
                    <button className="w-full flex items-center px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-medium transition-colors">
                        <FileText className="w-4 h-4 mr-3" />
                        Templates
                    </button>
                </div>
                
                <div className="mt-auto p-4 border-t border-slate-100">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-200">
                            JD
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-slate-700 truncate">John Doe</p>
                            <p className="text-xs text-slate-500 truncate">Senior Analyst</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow flex flex-col h-full overflow-hidden">
                {/* Header */}
                <header className="px-8 py-8 flex-shrink-0">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Analysis Library</h1>
                        <button 
                            onClick={onCreate}
                            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-all font-medium text-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Analysis
                        </button>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="relative max-w-md">
                        <input 
                            type="text" 
                            placeholder="Filter by name, site, or owner..." 
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none shadow-sm transition-all placeholder:text-slate-400"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                </header>

                {/* Grid / List */}
                <div className="flex-grow overflow-y-auto px-8 pb-8">
                    {queries.length === 0 ? (
                         <div className="flex flex-col items-center justify-center h-64 text-center border border-dashed border-slate-300 rounded-lg bg-slate-50/50">
                            <div className="p-3 bg-slate-100 rounded-full mb-3">
                                <FileText className="w-6 h-6 text-slate-400" />
                            </div>
                            <p className="text-slate-900 font-medium">No analyses found</p>
                            <p className="text-slate-500 text-sm mt-1 mb-4">Get started by creating a new asset analysis.</p>
                            <button onClick={onCreate} className="text-blue-600 text-sm font-semibold hover:underline">Create Analysis</button>
                         </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                                    <tr>
                                        <th className="px-6 py-3 text-sm font-medium w-12"></th>
                                        <th className="px-6 py-3 text-sm font-medium">Name</th>
                                        <th className="px-6 py-3 text-sm font-medium">Context</th>
                                        <th className="px-6 py-3 text-sm font-medium">Modified</th>
                                        <th className="px-6 py-3 text-sm font-medium">Status</th>
                                        <th className="px-6 py-3 text-sm font-medium text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {queries.map(q => (
                                        <tr 
                                            key={q.id} 
                                            onClick={() => onOpen(q.id)}
                                            className="hover:bg-slate-50 cursor-pointer transition-colors group"
                                        >
                                            <td className="px-6 py-4 text-center">
                                                <div className="p-2 rounded-md bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{q.name}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{q.user}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-700">{q.site}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{q.department}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {q.lastModified}
                                            </td>
                                            <td className="px-6 py-4">
                                                 <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                                                    ${q.status === 'Completed' 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                        : 'bg-amber-50 text-amber-700 border-amber-100'}
                                                `}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${q.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                                    {q.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};