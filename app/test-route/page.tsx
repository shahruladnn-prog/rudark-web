export const dynamic = 'force-dynamic';

export default function TestPage() {
    return (
        <div style={{ padding: 50, background: 'blue', color: 'white' }}>
            <h1>Test Route Works</h1>
            <p>Time: {new Date().toISOString()}</p>
        </div>
    );
}
