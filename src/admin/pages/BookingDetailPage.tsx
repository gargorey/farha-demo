import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Globe, Mail, MessageCircle, MessageSquareWarning, Phone, UserRound } from 'lucide-react';
import { PriceSummary } from '@/components/booking/PriceSummary';
import { StatusBadge } from '@/components/booking/StatusBadge';
import { Button } from '@/components/common/Button';
import { Field, Textarea } from '@/components/common/Field';
import { ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { useReferenceData } from '@/hooks/useReferenceData';
import { adminApi } from '../api';
import { useSession } from '../auth/session';
import { Card, ConfirmDialog, ReadOnlyNote, useToast } from '../components/ui';
import { useCatalog } from '../hooks/useCatalog';
import { useAdminLocale } from '../i18n';
import type { AdminBooking, BookingAction } from '../models';
import { ACTIONS, availableActions } from '../utils/booking-actions';
import { siteUrl } from '../utils/helpers';

const NOTE_REQUIRED: BookingAction[] = ['reject', 'approve_cancellation', 'decline_cancellation'];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-ink-500">{label}</dt>
      <dd className="min-w-0 font-medium text-ink-900">{children}</dd>
    </div>
  );
}

export default function BookingDetailPage() {
  const { id = '' } = useParams();
  const { data, error, loading, reload } = useAsync(() => adminApi.getBooking(id), [id]);
  const [override, setOverride] = useState<AdminBooking | null>(null);
  const { a } = useAdminLocale();

  if (loading && !data) return <LoadingBlock />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} title={a('common.loadFailed')} />;
  const booking = override?.id === data.id ? override : data;
  return <BookingDetail booking={booking} onChange={setOverride} />;
}

function BookingDetail({ booking: b, onChange }: { booking: AdminBooking; onChange: (b: AdminBooking) => void }) {
  const { a, t, l, num, date, time, dateTime } = useAdminLocale();
  const { cityById, eventTypeById } = useReferenceData();
  const { serviceById, providerById } = useCatalog();
  const { can } = useSession();
  const toast = useToast();
  const canManage = can('bookings.manage');
  const service = serviceById(b.selection.serviceId);
  const pkg = service?.packages.find((p) => p.id === b.selection.packageId);
  const provider = service ? providerById(service.providerId) : undefined;

  const [pending, setPending] = useState<BookingAction | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [modNote, setModNote] = useState('');

  const actions = availableActions(b);

  async function run(fn: () => Promise<AdminBooking>, message: string) {
    setBusy(true);
    try {
      onChange(await fn());
      toast(message);
      return true;
    } catch {
      toast(a('common.saveFailed'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function confirmAction() {
    if (!pending) return;
    if (NOTE_REQUIRED.includes(pending) && !actionNote.trim()) {
      setNoteError(a('booking.noteRequired'));
      return;
    }
    const ok = await run(() => adminApi.transitionBooking(b.id, pending, actionNote), a('booking.done'));
    if (ok) {
      setPending(null);
      setActionNote('');
    }
  }

  const contactIcon = { phone: Phone, whatsapp: MessageCircle, email: Mail }[b.customer.contactMethod];
  const ContactIcon = contactIcon ?? Phone;

  return (
    <>
      <Link to="/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-plum-700 hover:underline">
        <ArrowLeft className="flip-rtl size-4" aria-hidden="true" />
        {a('booking.back')}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {a('booking.title', { ref: '' })}
            <span className="ltr-value">{b.reference}</span>
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {a('booking.created', { date: dateTime(b.createdAt) })} · {a(`bookings.channel.${b.channel ?? 'website'}`)}
          </p>
        </div>
        <StatusBadge status={b.status} className="text-sm" />
      </div>

      {adminApi.isDemo && b.origin === 'website' && (
        <p className="mb-5 flex flex-wrap items-center gap-2 rounded-xl bg-plum-50 px-4 py-2.5 text-sm text-plum-800">
          <Globe className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{a('booking.websiteSync')}</span>
          <a href={siteUrl(`/bookings/${b.id}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline">
            {a('booking.openOnSite')}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {b.modificationRequest && (
            <section className="rounded-2xl border border-coral-100 bg-coral-100/40 p-5">
              <h2 className="flex items-center gap-2 font-bold text-coral-600">
                <MessageSquareWarning className="size-5" aria-hidden="true" />
                {a('booking.modification')}
              </h2>
              <p className="mt-2 text-ink-900">“{b.modificationRequest.message}”</p>
              <p className="mt-1 text-xs text-ink-500">{dateTime(b.modificationRequest.requestedAt)}</p>
              {canManage && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    className="h-10 flex-1 rounded-xl border border-ink-100 bg-white px-3 text-sm"
                    placeholder={a('booking.modificationNote')}
                    aria-label={a('booking.modificationNote')}
                    value={modNote}
                    onChange={(e) => setModNote(e.target.value)}
                  />
                  <Button size="sm" className="h-10" loading={busy} onClick={() => run(() => adminApi.resolveModification(b.id, modNote), a('booking.done'))}>
                    {a('booking.modificationHandled')}
                  </Button>
                </div>
              )}
            </section>
          )}

          <Card title={a('booking.event')}>
            <dl className="divide-y divide-ink-100">
              <Row label={a('booking.fields.service')}>
                {l(service?.name)}
                {provider && <span className="block text-xs font-normal text-ink-500">{l(provider.name)}</span>}
              </Row>
              <Row label={a('booking.fields.package')}>{l(pkg?.name)}</Row>
              {b.selection.addOns.length > 0 && (
                <Row label={a('booking.fields.addOns')}>
                  {b.selection.addOns
                    .map((x) => `${l(service?.addOns.find((ad) => ad.id === x.addOnId)?.name)}${x.quantity > 1 ? ` × ${num(x.quantity)}` : ''}`)
                    .join('، ')}
                </Row>
              )}
              <Row label={a('booking.fields.eventType')}>{l(eventTypeById(b.event.eventTypeId)?.name)}</Row>
              <Row label={a('booking.fields.date')}>{date(b.event.date)}</Row>
              <Row label={a('booking.fields.time')}>
                {time(b.event.startTime)}
                {b.event.extraHours > 0 && ` (+${num(b.event.extraHours)} ${a('common.hours')})`}
              </Row>
              <Row label={a('booking.fields.city')}>{l(cityById(b.event.cityId)?.name)}</Row>
              <Row label={a('booking.fields.venue')}>{b.event.venue}</Row>
              <Row label={a('booking.fields.attendees')}>{num(b.event.attendees)}</Row>
              {b.event.notes && <Row label={a('booking.fields.notes')}>{b.event.notes}</Row>}
            </dl>
          </Card>

          <Card title={a('booking.timeline')}>
            <ol className="relative space-y-4 border-s-2 border-plum-100 ps-5">
              {[...b.history].reverse().map((h, i) => (
                <li key={`${h.at}-${i}`} className="relative">
                  <span className="absolute -start-[1.6rem] top-1.5 size-3 rounded-full border-2 border-white bg-plum-500" aria-hidden="true" />
                  <p className="text-sm font-semibold">{t(h.noteKey)}</p>
                  {h.note && <p className="text-sm text-ink-700">“{h.note}”</p>}
                  <p className="text-xs text-ink-500">
                    {dateTime(h.at)} · {t(`status.${h.status}`)}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title={a('booking.actionsTitle')}>
            {!canManage ? (
              <ReadOnlyNote />
            ) : actions.length === 0 ? (
              <p className="text-sm text-ink-500">{b.status === 'confirmed' ? a('booking.futureComplete') : a('booking.noActions')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {actions.map((action) => (
                  <Button key={action} variant={ACTIONS[action].tone} onClick={() => setPending(action)}>
                    {a(`booking.actions.${action}`)}
                  </Button>
                ))}
              </div>
            )}
          </Card>

          <Card title={a('booking.customer')}>
            <p className="font-bold">{b.customer.fullName}</p>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <dt className="sr-only">{a('booking.fields.phone')}</dt>
                <Phone className="size-4 text-ink-300" aria-hidden="true" />
                <dd>
                  <a className="ltr-value hover:underline" href={`tel:${b.customer.phone}`}>
                    {b.customer.phone}
                  </a>
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="sr-only">{a('booking.fields.email')}</dt>
                <Mail className="size-4 text-ink-300" aria-hidden="true" />
                <dd className="min-w-0 truncate">
                  <a className="hover:underline" href={`mailto:${b.customer.email}`}>
                    {b.customer.email}
                  </a>
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="sr-only">{a('booking.fields.contactMethod')}</dt>
                <ContactIcon className="size-4 text-ink-300" aria-hidden="true" />
                <dd>
                  {a('booking.fields.contactMethod')}: {a(`booking.contact.${b.customer.contactMethod}`)}
                </dd>
              </div>
            </dl>
            <Link
              to={`/customers?q=${encodeURIComponent(b.customer.phone)}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-plum-700 hover:underline"
            >
              <UserRound className="size-4" aria-hidden="true" />
              {a('booking.viewCustomer')}
            </Link>
          </Card>

          <Card title={a('booking.pricing')}>
            {service && <PriceSummary pricing={b.pricing} service={service} />}
            {adminApi.isDemo && b.origin === 'website' && <p className="mt-3 text-xs text-ink-500">{a('booking.estimate')}</p>}
          </Card>

          <Card title={a('booking.notes')}>
            <p className="-mt-1 mb-3 text-xs text-ink-500">{a('booking.notesHint')}</p>
            {(b.internalNotes ?? []).length === 0 ? (
              <p className="text-sm text-ink-500">{a('booking.noNotes')}</p>
            ) : (
              <ul className="space-y-3">
                {b.internalNotes!.map((n, i) => (
                  <li key={i} className="rounded-xl bg-sand-50 p-3 text-sm">
                    <p className="whitespace-pre-wrap">{n.text}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      {n.by} · {dateTime(n.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {canManage && (
              <form
                className="mt-4 space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!note.trim()) return;
                  if (await run(() => adminApi.addBookingNote(b.id, note), a('common.saved'))) setNote('');
                }}
              >
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={a('booking.notePlaceholder')} aria-label={a('booking.addNote')} className="min-h-20" />
                <Button type="submit" size="sm" variant="secondary" disabled={!note.trim()} loading={busy}>
                  {a('booking.addNote')}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!pending}
        title={pending ? a(`booking.actions.${pending}`) : ''}
        text={pending ? a(`booking.confirmText.${pending}`) : ''}
        confirmLabel={pending ? a(`booking.actions.${pending}`) : ''}
        tone={pending && ACTIONS[pending].tone === 'danger' ? 'danger' : 'primary'}
        loading={busy}
        onConfirm={confirmAction}
        onClose={() => {
          setPending(null);
          setActionNote('');
          setNoteError('');
        }}
      >
        <Field
          label={a('booking.noteLabel')}
          required={!!pending && NOTE_REQUIRED.includes(pending)}
          optionalLabel={a('common.optional')}
          error={noteError}
          className="mt-4"
        >
          {(p) => (
            <Textarea
              {...p}
              value={actionNote}
              onChange={(e) => {
                setActionNote(e.target.value);
                setNoteError('');
              }}
            />
          )}
        </Field>
      </ConfirmDialog>
    </>
  );
}
