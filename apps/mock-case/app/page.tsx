import { MockCaseLab } from "./components/mock-case-lab";
import { createIntercomUserJwt } from "../lib/intercom-messenger";

export default async function Home() {
  const intercomAppId = process.env.NEXT_PUBLIC_INTERCOM_APP_ID?.trim() ?? "";
  const configuredRegion = process.env.INTERCOM_REGION;
  const intercomRegion =
    configuredRegion === "us" || configuredRegion === "au"
      ? configuredRegion
      : "eu";
  const user = {
    id: process.env.INTERCOM_TEST_USER_EXTERNAL_ID ?? "weppo-mock-user-001",
    name: process.env.INTERCOM_TEST_USER_NAME ?? "Maya Chen",
    email:
      process.env.INTERCOM_TEST_USER_EMAIL ?? "maya.chen+weppo-mock@example.com",
  };
  const intercomSecret = process.env.INTERCOM_MESSENGER_SECRET?.trim();
  const visitorMode = process.env.INTERCOM_TEST_AS_VISITOR === "true";

  return (
    <MockCaseLab
      enabled={process.env.ENABLE_MOCK_CASES === "true"}
      intercomWidget={
        intercomAppId
          ? {
              appId: intercomAppId,
              region: intercomRegion,
              user,
              userJwt: visitorMode
                ? null
                : intercomSecret
                  ? createIntercomUserJwt(intercomSecret, user)
                  : undefined,
            }
          : null
      }
    />
  );
}
