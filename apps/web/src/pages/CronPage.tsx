/**
 * Cron Page
 * Manage scheduled tasks
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Clock,
  Play,
  Pause,
  Trash2,
  Edit,
  RefreshCw,
  X,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
  Timer,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCronStore } from '@/store/useCronStore';
import { useZeroClawSocketStore, AIConnectionState } from '@/store/useZeroClawSocketStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/lib/utils';
import { toast } from 'react-toastify';
import type { CronJob, CronJobCreateInput, ScheduleType } from '@/types/cron';

// Common cron schedule presets
const schedulePresets: { label: string; value: string; type: ScheduleType }[] = [
  { label: 'Every minute', value: '* * * * *', type: 'interval' },
  { label: 'Every 5 minutes', value: '*/5 * * * *', type: 'interval' },
  { label: 'Every 15 minutes', value: '*/15 * * * *', type: 'interval' },
  { label: 'Every hour', value: '0 * * * *', type: 'interval' },
  { label: 'Daily at 9am', value: '0 9 * * *', type: 'daily' },
  { label: 'Daily at 6pm', value: '0 18 * * *', type: 'daily' },
  { label: 'Weekly (Mon 9am)', value: '0 9 * * 1', type: 'weekly' },
  { label: 'Monthly (1st at 9am)', value: '0 9 1 * *', type: 'monthly' },
];

/**
 * Helper to format relative time (minimal version for raven)
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return date.toLocaleDateString();
}

/**
 * Internal i18n mock ( raven doesn't use i18next yet in this way )
 */
const t = (key: string) => {
  const translations: Record<string, string> = {
    'title': 'Cron Tasks',
    'subtitle': 'Manage your scheduled agent tasks and automations.',
    'refresh': 'Refresh',
    'newTask': 'New Task',
    'gatewayWarning': 'ZeroClaw Gateway is not connected. Some features may be limited.',
    'stats.total': 'Total Tasks',
    'stats.active': 'Active',
    'stats.paused': 'Paused',
    'stats.failed': 'Failed',
    'empty.title': 'No cron tasks found',
    'empty.description': 'Create your first scheduled task to automate agent interactions.',
    'empty.create': 'Create Task',
    'card.deleteConfirm': 'Are you sure you want to delete this task?',
    'card.last': 'Last run',
    'card.next': 'Next run',
    'card.runNow': 'Run Now',
    'dialog.createTitle': 'Create Cron Task',
    'dialog.editTitle': 'Edit Cron Task',
    'dialog.description': 'Configure a message to be sent to a channel on a regular schedule.',
    'dialog.taskName': 'Task Name',
    'dialog.taskNamePlaceholder': 'e.g., Daily Summary',
    'dialog.message': 'Message',
    'dialog.messagePlaceholder': 'The message text or prompt to send',
    'dialog.schedule': 'Schedule',
    'dialog.useCustomCron': 'Use custom cron expression',
    'dialog.usePresets': 'Use presets',
    'dialog.targetChannel': 'Target Channel',
    'dialog.discordChannelId': 'Discord Channel ID',
    'dialog.discordChannelIdPlaceholder': 'Enter Discord channel ID',
    'dialog.discordChannelIdDesc': 'For Discord tasks, the bot needs a specific channel ID.',
    'dialog.enableImmediately': 'Enable task',
    'dialog.enableImmediatelyDesc': 'The task will start running immediately according to schedule.',
    'presets.everyMinute': 'Every minute',
    'presets.every5Min': 'Every 5 minutes',
    'presets.every15Min': 'Every 15 minutes',
    'presets.everyHour': 'Every hour',
    'presets.daily9am': 'Daily at 9am',
    'presets.daily6pm': 'Daily at 6pm',
    'presets.weeklyMon': 'Weekly (Mon 9am)',
    'presets.monthly1st': 'Monthly (1st at 9am)',
    'toast.nameRequired': 'Name is required',
    'toast.messageRequired': 'Message is required',
    'toast.channelRequired': 'Target channel is required',
    'toast.discordIdRequired': 'Discord Channel ID is required',
    'toast.scheduleRequired': 'Schedule is required',
    'toast.triggered': 'Task triggered successfully',
    'toast.updated': 'Task updated successfully',
    'toast.created': 'Task created successfully',
    'toast.deleted': 'Task deleted successfully',
    'toast.enabled': 'Task enabled',
    'toast.paused': 'Task paused',
    'toast.failedUpdate': 'Failed to update task',
    'toast.failedDelete': 'Failed to delete task',
  };
  return translations[key] || key;
};

// Parse cron schedule to human-readable format
function parseCronSchedule(schedule: unknown): string {
  if (schedule && typeof schedule === 'object') {
    const s = schedule as { kind?: string; expr?: string; tz?: string; everyMs?: number; at?: string };
    if (s.kind === 'cron' && typeof s.expr === 'string') {
      return parseCronExpr(s.expr);
    }
    if (s.kind === 'every' && typeof s.everyMs === 'number') {
      const ms = s.everyMs;
      if (ms < 60_000) return `Every ${Math.round(ms / 1000)}s`;
      if (ms < 3_600_000) return `Every ${Math.round(ms / 60_000)} minutes`;
      if (ms < 86_400_000) return `Every ${Math.round(ms / 3_600_000)} hours`;
      return `Every ${Math.round(ms / 86_400_000)} days`;
    }
    if (s.kind === 'at' && typeof s.at === 'string') {
      try {
        return `Once at ${new Date(s.at).toLocaleString()}`;
      } catch {
        return `Once at ${s.at}`;
      }
    }
    return String(schedule);
  }

  if (typeof schedule === 'string') {
    return parseCronExpr(schedule);
  }

  return String(schedule ?? 'Unknown');
}

// Parse a plain cron expression string to human-readable text
function parseCronExpr(cron: string): string {
  const preset = schedulePresets.find((p) => p.value === cron);
  if (preset) return t(`presets.${preset.label.replace(/ /g, '').replace('(', '').replace(')', '')}`) || preset.label;

  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, , dayOfWeek] = parts;

  if (minute === '*' && hour === '*') return 'Every minute';
  if (minute.startsWith('*/')) return `Every ${minute.slice(2)} minutes`;
  if (hour === '*' && minute === '0') return 'Every hour';
  if (dayOfWeek !== '*' && dayOfMonth === '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `Weekly on ${days[parseInt(dayOfWeek)]} at ${hour}:${minute.padStart(2, '0')}`;
  }
  if (dayOfMonth !== '*') {
    return `Monthly on day ${dayOfMonth} at ${hour}:${minute.padStart(2, '0')}`;
  }
  if (hour !== '*') {
    return `Daily at ${hour}:${minute.padStart(2, '0')}`;
  }

  return cron;
}

// Create/Edit Task Dialog
interface TaskDialogProps {
  job?: CronJob;
  onClose: () => void;
  onSave: (input: CronJobCreateInput) => Promise<void>;
}

function TaskDialog({ job, onClose, onSave }: TaskDialogProps) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(job?.name || '');
  const [message, setMessage] = useState(job?.message || '');

  const initialSchedule = (() => {
    const s = job?.schedule;
    if (!s) return '0 9 * * *';
    if (typeof s === 'string') return s;
    if (typeof s === 'object' && 'expr' in s && typeof (s as { expr: string }).expr === 'string') {
      return (s as { expr: string }).expr;
    }
    return '0 9 * * *';
  })();

  const [schedule, setSchedule] = useState(initialSchedule);
  const [customSchedule, setCustomSchedule] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [channelType, setChannelType] = useState(job?.target.channelType || 'discord');
  const [discordChannelId, setDiscordChannelId] = useState(job?.target.channelId || '');
  const [enabled, setEnabled] = useState(job?.enabled ?? true);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('toast.nameRequired'));
      return;
    }
    if (!message.trim()) {
      toast.error(t('toast.messageRequired'));
      return;
    }

    // Validate Discord channel ID when Discord is selected
    if (channelType === 'discord' && !discordChannelId.trim()) {
      toast.error(t('toast.discordIdRequired'));
      return;
    }

    const finalSchedule = useCustom ? customSchedule : schedule;
    if (!finalSchedule.trim()) {
      toast.error(t('toast.scheduleRequired'));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        message: message.trim(),
        schedule: finalSchedule,
        target: {
          channelType,
          channelId: discordChannelId.trim(),
          channelName: channelType,
        },
        enabled,
      });
      onClose();
      toast.success(job ? t('toast.updated') : t('toast.created'));
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>{job ? t('dialog.editTitle') : t('dialog.createTitle')}</CardTitle>
            <CardDescription>{t('dialog.description')}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('dialog.taskName')}</Label>
            <Input
              id="name"
              placeholder={t('dialog.taskNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t('dialog.message')}</Label>
            <Textarea
              id="message"
              placeholder={t('dialog.messagePlaceholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('dialog.schedule')}</Label>
            {!useCustom ? (
              <div className="grid grid-cols-2 gap-2">
                {schedulePresets.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={schedule === preset.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSchedule(preset.value)}
                    className="justify-start"
                  >
                    <Timer className="h-4 w-4 mr-2" />
                    {t(`presets.${preset.label.replace(/ /g, '').replace('(', '').replace(')', '')}`) || preset.label}
                  </Button>
                ))}
              </div>
            ) : (
              <Input
                placeholder="* * * * *"
                value={customSchedule}
                onChange={(e) => setCustomSchedule(e.target.value)}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUseCustom(!useCustom)}
              className="text-xs"
            >
              {useCustom ? t('dialog.usePresets') : t('dialog.useCustomCron')}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>{t('dialog.targetChannel')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {['discord', 'telegram', 'slack', 'whatsapp'].map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={channelType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChannelType(type)}
                  className="justify-start capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {channelType === 'discord' && (
            <div className="space-y-2">
              <Label>{t('dialog.discordChannelId')}</Label>
              <Input
                value={discordChannelId}
                onChange={(e) => setDiscordChannelId(e.target.value)}
                placeholder={t('dialog.discordChannelIdPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('dialog.discordChannelIdDesc')}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label>{t('dialog.enableImmediately')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('dialog.enableImmediatelyDesc')}
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {job ? 'Save Changes' : 'Create Task'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Job Card Component
interface CronJobCardProps {
  job: CronJob;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onTrigger: () => Promise<void>;
}

function CronJobCard({ job, onToggle, onEdit, onDelete, onTrigger }: CronJobCardProps) {
  const [triggering, setTriggering] = useState(false);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await onTrigger();
      toast.success(t('toast.triggered'));
    } catch (error) {
      console.error('Failed to trigger cron job:', error);
      toast.error(`Failed to trigger task: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleDelete = () => {
    if (confirm(t('card.deleteConfirm'))) {
      onDelete();
    }
  };

  return (
    <Card className={cn(
      'transition-colors',
      job.enabled && 'border-primary/30'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'rounded-full p-2',
              job.enabled
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-muted'
            )}>
              <Clock className={cn(
                'h-5 w-5',
                job.enabled ? 'text-green-600' : 'text-muted-foreground'
              )} />
            </div>
            <div>
              <CardTitle className="text-lg">{job.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Timer className="h-3 w-3" />
                {parseCronSchedule(job.schedule)}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={job.enabled ? 'outline' : 'secondary'} className={job.enabled ? "border-green-500 text-green-500" : ""}>
              {job.enabled ? t('stats.active') : t('stats.paused')}
            </Badge>
            <Switch
              checked={job.enabled}
              onCheckedChange={onToggle}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground line-clamp-2">
            {job.message}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 uppercase text-[10px] font-bold tracking-wider">
            {job.target.channelType}
          </span>

          {job.lastRun && (
            <span className="flex items-center gap-1">
              <History className="h-4 w-4" />
              {t('card.last')}: {formatRelativeTime(job.lastRun.time)}
              {job.lastRun.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </span>
          )}

          {job.nextRun && job.enabled && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {t('card.next')}: {new Date(job.nextRun).toLocaleString()}
            </span>
          )}
        </div>

        {job.lastRun && !job.lastRun.success && job.lastRun.error && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{job.lastRun.error}</span>
          </div>
        )}

        <div className="flex justify-end gap-1 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTrigger}
            disabled={triggering}
          >
            {triggering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="ml-1">{t('card.runNow')}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
            <span className="ml-1">Edit</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
            <span className="ml-1 text-destructive">Delete</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CronPage() {
  const { jobs, loading, error, fetchJobs, addJob, updateJob, toggleJob, deleteJob, triggerJob } = useCronStore();
  const socketStore = useZeroClawSocketStore();
  const [showDialog, setShowDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | undefined>();

  const isGatewayConnected = socketStore.connectionState === AIConnectionState.CONNECTED;

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const activeJobs = jobs.filter((j) => j.enabled);
  const pausedJobs = jobs.filter((j) => !j.enabled);
  const failedJobs = jobs.filter((j) => j.lastRun && !j.lastRun.success);

  const handleSave = useCallback(async (input: CronJobCreateInput) => {
    if (editingJob) {
      await updateJob(editingJob.id, input);
    } else {
      await addJob(input);
    }
  }, [editingJob, addJob, updateJob]);

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    try {
      await toggleJob(id, enabled);
      toast.success(enabled ? t('toast.enabled') : t('toast.paused'));
    } catch {
      toast.error(t('toast.failedUpdate'));
    }
  }, [toggleJob]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteJob(id);
      toast.success(t('toast.deleted'));
    } catch {
      toast.error(t('toast.failedDelete'));
    }
  }, [deleteJob]);

  if (loading && jobs.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchJobs} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            {t('refresh')}
          </Button>
          <Button
            onClick={() => {
              setEditingJob(undefined);
              setShowDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('newTask')}
          </Button>
        </div>
      </div>

      {!isGatewayConnected && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <span className="text-yellow-600 dark:text-yellow-400">
              {t('gatewayWarning')}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: t('stats.total'), value: jobs.length, icon: Clock, color: 'text-blue-500' },
          { label: t('stats.active'), value: activeJobs.length, icon: Play, color: 'text-green-500' },
          { label: t('stats.paused'), value: pausedJobs.length, icon: Pause, color: 'text-yellow-500' },
          { label: t('stats.failed'), value: failedJobs.length, icon: XCircle, color: 'text-red-500' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={cn("rounded-full bg-muted p-3", stat.color)}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4 text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </CardContent>
        </Card>
      )}

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('empty.title')}</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              {t('empty.description')}
            </p>
            <Button
              onClick={() => {
                setEditingJob(undefined);
                setShowDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('empty.create')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job) => (
            <CronJobCard
              key={job.id}
              job={job}
              onToggle={(enabled) => handleToggle(job.id, enabled)}
              onEdit={() => {
                setEditingJob(job);
                setShowDialog(true);
              }}
              onDelete={() => handleDelete(job.id)}
              onTrigger={() => triggerJob(job.id)}
            />
          ))}
        </div>
      )}

      {showDialog && (
        <TaskDialog
          job={editingJob}
          onClose={() => {
            setShowDialog(false);
            setEditingJob(undefined);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default CronPage;
