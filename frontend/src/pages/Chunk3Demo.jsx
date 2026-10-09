import { useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Modal from '../components/ui/Modal.jsx'
import Table from '../components/ui/Table.jsx'
import Card, { CardBody, CardHeader, CardTitle } from '../components/ui/Card.jsx'

const ROWS = [
  { id: 1, patient: 'Ada Okoro', doctor: 'Dr. Smith', date: '15 Oct 2026', status: 'confirmed' },
  { id: 2, patient: 'Musa Bello', doctor: 'Dr. Smith', date: '16 Oct 2026', status: 'pending' },
  { id: 3, patient: 'Chioma Eze', doctor: 'Dr. Ade', date: '17 Oct 2026', status: 'cancelled' },
]

const STATUS_STYLES = {
  pending: 'border-line bg-background text-muted',
  confirmed: 'border-primary-border bg-primary-tint text-primary',
  cancelled: 'border-danger-border bg-danger-tint text-danger',
}

function StatusBadge({ value }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[value]}`}
    >
      {value}
    </span>
  )
}

export default function Chunk3Demo() {
  const [selected, setSelected] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const columns = [
    { key: 'patient', header: 'Patient' },
    { key: 'doctor', header: 'Doctor' },
    { key: 'date', header: 'Date' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => setSelected(row)}>
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-2xl font-semibold text-ink">Chunk 3 preview</h1>
      <p className="mt-1 text-muted">Navbar, logo slot, table, and modal.</p>

      <div className="mt-8">
        <Table columns={columns} rows={ROWS} rowKey={(row) => row.id} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => setConfirmOpen(true)}>Open modal</Button>
      </div>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Empty state</CardTitle>
        </CardHeader>
        <CardBody>
          <Table
            columns={columns}
            rows={[]}
            emptyMessage="No appointments booked yet."
          />
        </CardBody>
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Appointment details"
        description={selected ? `${selected.patient} · ${selected.date}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button onClick={() => setSelected(null)}>Confirm</Button>
          </>
        }
      >
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted">Patient</dt>
            <dd className="mt-0.5 font-medium text-ink">{selected?.patient}</dd>
          </div>
          <div>
            <dt className="text-muted">Doctor</dt>
            <dd className="mt-0.5 font-medium text-ink">{selected?.doctor}</dd>
          </div>
          <div>
            <dt className="text-muted">Date</dt>
            <dd className="mt-0.5 font-medium text-ink">{selected?.date}</dd>
          </div>
          <div>
            <dt className="text-muted">Status</dt>
            <dd className="mt-0.5">{selected && <StatusBadge value={selected.status} />}</dd>
          </div>
        </dl>
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Cancel this appointment?"
        description="The doctor will be notified and this cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Keep appointment
            </Button>
            <Button variant="danger" onClick={() => setConfirmOpen(false)}>
              Cancel appointment
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Ada Okoro · Dr. Smith · 15 Oct 2026, 10:30 AM
        </p>
      </Modal>
    </div>
  )
}
