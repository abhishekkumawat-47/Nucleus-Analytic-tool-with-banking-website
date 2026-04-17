package com.nexabank.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexabank.enums.LoanType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "\"Loan\"")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"loanType\"", nullable = false)
    private LoanType loanType;

    @Column(name = "\"interestRate\"", nullable = false)
    private Double interestRate;

    @Column(name = "\"principalAmount\"", nullable = false)
    private Double principalAmount;

    @Column(name = "\"interestAmount\"", nullable = false)
    private Double interestAmount;

    @Column(nullable = false)
    private Integer term;

    @Column(name = "\"startDate\"", nullable = false)
    private LocalDateTime startDate;

    @Column(name = "\"endDate\"", nullable = false)
    private LocalDateTime endDate;

    @Column(nullable = false)
    @Builder.Default
    private Boolean status = true;

    @Column(name = "\"createdOn\"", nullable = false)
    @Builder.Default
    private LocalDateTime createdOn = LocalDateTime.now();

    @Column(name = "\"updatedOn\"", nullable = false)
    @Builder.Default
    private LocalDateTime updatedOn = LocalDateTime.now();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<Object> schedule;

    @Column(name = "\"dueAmount\"", nullable = false)
    private Double dueAmount;

    @Column(name = "\"accNo\"", nullable = false)
    private String accNo;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"accNo\"", referencedColumnName = "\"accNo\"", insertable = false, updatable = false)
    private Account account;

    @JsonIgnore
    @OneToMany(mappedBy = "loan", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Transaction> payments;

    @PreUpdate
    public void preUpdate() {
        this.updatedOn = LocalDateTime.now();
    }
}
