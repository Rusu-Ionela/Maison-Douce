import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK!);

export default function CheckoutStripe({ clientSecret }: { clientSecret: string }) {
    return (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
            <FormInner />
        </Elements>
    );
}

function FormInner() {
    const stripe = useStripe();
    const elements = useElements();
    const handle = async (e: any) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        const { error } = await stripe.confirmPayment({ elements, confirmParams: { return_url: window.location.origin + '/checkout/success' } });
        if (error) alert(error.message);
    };
    return <form onSubmit={handle}><PaymentElement /><button>Plătește</button></form>;
}
