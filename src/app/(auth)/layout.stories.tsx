import type { Meta, StoryObj } from "@storybook/react";
import AuthLayout from "./layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// AuthLayout is a thin server component — it renders fine in Storybook.
// The children below are a static placeholder standing in for the auth forms.
const meta: Meta<typeof AuthLayout> = {
  title: "Auth/AuthLayout",
  component: AuthLayout,
};

export { meta as default };

type Story = StoryObj<typeof AuthLayout>;

export const Default: Story = {
  args: {
    children: (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            Sign in to Memo
          </CardTitle>
          <CardDescription>
            Enter your email and password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Auth form content renders here.
          </p>
        </CardContent>
      </Card>
    ),
  },
};
