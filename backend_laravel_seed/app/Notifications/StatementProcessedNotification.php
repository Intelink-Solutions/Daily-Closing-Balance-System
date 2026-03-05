<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StatementProcessedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly int $transactionsImported,
        private readonly int $dailyClosingsProcessed,
        private readonly bool $queued,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage())
            ->subject('DCBS Statement Processing Update')
            ->greeting('Hello '.$notifiable->name.',');

        if ($this->queued) {
            return $message
                ->line('Your statement upload has been accepted and queued for processing.')
                ->line('You will see imported transactions shortly in your dashboard.');
        }

        return $message
            ->line('Your statement was processed successfully.')
            ->line('Transactions imported: '.$this->transactionsImported)
            ->line('Daily closing days recalculated: '.$this->dailyClosingsProcessed);
    }
}
