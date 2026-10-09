import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Card, { CardBody, CardFooter, CardHeader, CardTitle } from '../components/ui/Card.jsx'

function Row({ title, children }) {
  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export default function KitchenSink() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-2xl font-semibold text-ink">Component kitchen sink</h1>
      <p className="mt-1 text-muted">Every variant in one place. Delete this page later.</p>

      <Row title="Button — variants">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Delete</Button>
        <Button variant="ghost">Ghost</Button>
      </Row>

      <Row title="Button — states">
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
        <Button variant="secondary" size="sm">Small</Button>
        <Button variant="secondary" size="lg">Large</Button>
      </Row>

      <Row title="Button — full width">
        <Button className="w-full sm:w-auto">Book appointment</Button>
      </Row>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Input label="Full name" placeholder="Ada Okoro" required />
        <Input
          label="Email address"
          type="email"
          placeholder="ada@example.com"
          hint="We only use this for appointment reminders."
        />
        <Input
          label="Password"
          type="password"
          defaultValue="short"
          error="Password must be at least 8 characters."
        />
        <Input label="Patient ID" placeholder="P-0001" disabled />
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appointment details</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-muted">
              Dr. Smith · General practice · Thursday, 10:30 AM
            </p>
          </CardBody>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="secondary" size="sm">Cancel</Button>
            <Button size="sm">Confirm</Button>
          </CardFooter>
        </Card>

        <Card className="border-danger-border">
          <CardHeader>
            <CardTitle className="text-danger">Allergies</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-muted">
              Penicillin — severe reaction. Always verify before prescribing.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
