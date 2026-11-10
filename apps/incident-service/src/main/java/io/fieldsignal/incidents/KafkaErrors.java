package io.fieldsignal.incidents;

import io.fieldsignal.events.ReadingRecorded;
import org.apache.kafka.common.TopicPartition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class KafkaErrors {
    @Bean
    DefaultErrorHandler errorHandler(KafkaTemplate<String, String> kafka) {
        var recoverer = new DeadLetterPublishingRecoverer(kafka,
                (record, exception) -> new TopicPartition(ReadingRecorded.TOPIC + ".DLT", record.partition()));
        recoverer.setFailIfSendResultIsError(true);
        // Retry twice, then publish raw payload and failure headers to DLT.
        return new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 2L));
    }
}
