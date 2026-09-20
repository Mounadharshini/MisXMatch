package com.misxmatch.casesvc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean first;
    private boolean last;
    private boolean empty;

    public static <T> PageResponse<T> from(Page<T> springPage) {
        if (springPage == null) {
            return empty();
        }
        return PageResponse.<T>builder()
                .content(springPage.getContent())
                .page(springPage.getNumber())
                .size(springPage.getSize())
                .totalElements(springPage.getTotalElements())
                .totalPages(springPage.getTotalPages())
                .first(springPage.isFirst())
                .last(springPage.isLast())
                .empty(springPage.isEmpty())
                .build();
    }

    public static <T> PageResponse<T> of(List<T> content, int page, int size, long totalElements) {
        int effectiveSize = size > 0 ? size : 10;
        int totalPages = (int) Math.ceil((double) totalElements / effectiveSize);
        List<T> list = content != null ? content : Collections.emptyList();
        return PageResponse.<T>builder()
                .content(list)
                .page(page)
                .size(effectiveSize)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .first(page <= 0)
                .last(totalPages == 0 || page >= totalPages - 1)
                .empty(list.isEmpty())
                .build();
    }

    public static <T> PageResponse<T> empty() {
        return PageResponse.<T>builder()
                .content(Collections.emptyList())
                .page(0)
                .size(10)
                .totalElements(0)
                .totalPages(0)
                .first(true)
                .last(true)
                .empty(true)
                .build();
    }
}
