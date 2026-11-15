import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string | string[] | undefined }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const rawError = params.error;
  const oauthError = Array.isArray(rawError) ? rawError[0] : rawError;

  return <LoginForm oauthError={oauthError} />;
}
