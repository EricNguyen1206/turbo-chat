import { AISettingsPanel } from '@/components/organisms/AISettingsPanel'

export default function SettingsPage() {
  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences and AI configuration.</p>
      </div>

      <AISettingsPanel />
    </div>
  )
}
