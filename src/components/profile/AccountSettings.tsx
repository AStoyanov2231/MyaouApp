"use client";

import { useState } from "react";
import { LogOut, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

interface AccountSettingsProps {
  scheduledDeletionAt?: string | null;
  onCancelDeletion?: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
  className?: string;
}

export function AccountSettings({
  scheduledDeletionAt,
  onCancelDeletion,
  onDeleteAccount,
  className,
}: AccountSettingsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const isDeletionScheduled = !!scheduledDeletionAt;
  const canConfirmDelete = confirmText.toLowerCase() === "delete";

  const handleDelete = async () => {
    if (!onDeleteAccount || !canConfirmDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteAccount();
      setDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!onCancelDeletion) return;
    setIsCancelling(true);
    try {
      await onCancelDeletion();
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDeletionDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className={cn("px-4 md:px-6 py-4 space-y-4", className)}>
      {/* Scheduled Deletion Banner */}
      {isDeletionScheduled && scheduledDeletionAt && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>
              Your account is scheduled for deletion on{" "}
              <strong>{formatDeletionDate(scheduledDeletionAt)}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelDeletion}
              disabled={isCancelling}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              {isCancelling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Cancel Deletion
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="pt-4 border-t">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Account
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Sign Out Button */}
          <form action={signOut}>
            <Button variant="outline" className="w-full sm:w-auto">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </form>

          {/* Delete Account Button */}
          {!isDeletionScheduled && (
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Delete Your Account?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      This action will schedule your account for permanent deletion.
                      You will have <strong>7 days</strong> to change your mind by
                      logging back in.
                    </p>
                    <p className="text-destructive font-medium">
                      After 7 days, all your data will be permanently deleted:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                      <li>Your profile and photos</li>
                      <li>All messages you&apos;ve sent</li>
                      <li>Your friend connections</li>
                      <li>Your place history</li>
                    </ul>
                    <div className="pt-2">
                      <p className="text-sm font-medium mb-2">
                        Type <span className="text-destructive">DELETE</span> to confirm:
                      </p>
                      <Input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Type DELETE"
                        className="max-w-[200px]"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText("")}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={!canConfirmDelete || isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}
